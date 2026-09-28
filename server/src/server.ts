import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { roomManager } from './rooms/roomManager.js';
import { ClientMessage, ServerMessage, DeviceInfo } from './types/index.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Create HTTP server
const httpServer = http.createServer((req, res) => {
  // CORS Headers for API health check
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        name: 'DropLink Signaling Server',
        status: 'online',
        timestamp: Date.now(),
      })
    );
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Create WebSocket Server
const wss = new WebSocketServer({ server: httpServer });

// Map socket instance to socket metadata
interface SocketMetadata {
  deviceId?: string;
  roomId?: string;
  deviceInfo?: DeviceInfo;
}

const socketMetaMap = new WeakMap<WebSocket, SocketMetadata>();
// Map roomId -> Set<WebSocket> for instant room broadcasts
const roomSocketsMap = new Map<string, Set<WebSocket>>();

function registerSocketToRoom(roomId: string, socket: WebSocket) {
  if (!roomSocketsMap.has(roomId)) {
    roomSocketsMap.set(roomId, new Set());
  }
  roomSocketsMap.get(roomId)!.add(socket);
}

function unregisterSocketFromRoom(roomId: string, socket: WebSocket) {
  if (roomSocketsMap.has(roomId)) {
    const set = roomSocketsMap.get(roomId)!;
    set.delete(socket);
    if (set.size === 0) {
      roomSocketsMap.delete(roomId);
    }
  }
}

function broadcastToRoom(roomId: string, message: ServerMessage, excludeSocket?: WebSocket) {
  const sockets = roomSocketsMap.get(roomId);
  if (!sockets) return;

  const payloadStr = JSON.stringify(message);
  for (const clientSocket of sockets) {
    if (clientSocket !== excludeSocket && clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(payloadStr);
    }
  }
}

function sendToSocket(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

wss.on('connection', (ws: WebSocket, req) => {
  socketMetaMap.set(ws, {});
  console.log(`[WebSocket] New client connected from ${req.socket.remoteAddress}`);

  ws.on('message', (data: Buffer | string) => {
    try {
      const msgStr = data.toString();
      const message: ClientMessage = JSON.parse(msgStr);
      const meta = socketMetaMap.get(ws) || {};

      switch (message.type) {
        case 'create-room': {
          const { device } = message.payload || {};
          if (!device || !device.id) {
            sendToSocket(ws, {
              type: 'error',
              requestId: message.requestId,
              payload: { errorType: 'INVALID_DEVICE', errorMessage: 'Invalid device information.' },
            });
            return;
          }

          const room = roomManager.createRoom(device);
          meta.deviceId = device.id;
          meta.roomId = room.id;
          meta.deviceInfo = device;
          socketMetaMap.set(ws, meta);

          registerSocketToRoom(room.id, ws);

          console.log(`[Room] Created real room ${room.id} for host ${device.name}`);

          sendToSocket(ws, {
            type: 'room-created',
            requestId: message.requestId,
            payload: {
              room: roomManager.formatRoomForClient(room, device.id),
            },
          });
          break;
        }

        case 'join-room': {
          const { roomCode, device } = message.payload || {};
          if (!roomCode || !device || !device.id) {
            sendToSocket(ws, {
              type: 'error',
              requestId: message.requestId,
              payload: { errorType: 'INVALID_REQUEST', errorMessage: 'Missing room code or device info.' },
            });
            return;
          }

          const result = roomManager.joinRoom(roomCode, device);

          if (!result.success || !result.room) {
            sendToSocket(ws, {
              type: 'error',
              requestId: message.requestId,
              payload: {
                errorType: result.errorType || 'JOIN_FAILED',
                errorMessage: result.errorMessage || 'Failed to join room.',
              },
            });
            return;
          }

          const room = result.room;
          meta.deviceId = device.id;
          meta.roomId = room.id;
          meta.deviceInfo = device;
          socketMetaMap.set(ws, meta);

          registerSocketToRoom(room.id, ws);

          console.log(`[Room] Device ${device.name} joined room ${room.id}`);

          // Send confirmation to joining device
          sendToSocket(ws, {
            type: 'room-joined',
            requestId: message.requestId,
            payload: {
              room: roomManager.formatRoomForClient(room, device.id),
            },
          });

          // Broadcast device-joined to all other devices in the room in real-time
          broadcastToRoom(
            room.id,
            {
              type: 'device-joined',
              payload: {
                device: { ...device, isSelf: false, status: 'connected' },
                room: roomManager.formatRoomForClient(room, room.hostDeviceId),
              },
            },
            ws
          );
          break;
        }

        case 'leave-room': {
          const { roomId, deviceId } = message.payload || {};
          if (roomId && deviceId) {
            handleClientLeave(ws, roomId, deviceId);
          }
          break;
        }

        case 'close-room': {
          const { roomId, deviceId } = message.payload || {};
          if (roomId) {
            const room = roomManager.getRoom(roomId);
            if (room && room.hostDeviceId === deviceId) {
              console.log(`[Room] Host closed room ${roomId}`);
              
              // Broadcast room-closed to all clients in room
              broadcastToRoom(roomId, {
                type: 'room-closed',
                payload: { roomId, reason: 'Room closed by host' },
              });

              roomManager.closeRoom(roomId);
              roomSocketsMap.delete(roomId);
            }
          }
          break;
        }

        // WebRTC Signaling Relays
        case 'webrtc-offer': {
          const { roomId, sdp, senderId, targetId } = message.payload || {};
          if (roomId && sdp) {
            broadcastToRoom(
              roomId,
              {
                type: 'webrtc-offer',
                payload: { roomId, sdp, senderId, targetId },
              },
              ws
            );
          }
          break;
        }

        case 'webrtc-answer': {
          const { roomId, sdp, senderId, targetId } = message.payload || {};
          if (roomId && sdp) {
            broadcastToRoom(
              roomId,
              {
                type: 'webrtc-answer',
                payload: { roomId, sdp, senderId, targetId },
              },
              ws
            );
          }
          break;
        }

        case 'webrtc-ice': {
          const { roomId, candidate, senderId, targetId } = message.payload || {};
          if (roomId && candidate) {
            broadcastToRoom(
              roomId,
              {
                type: 'webrtc-ice',
                payload: { roomId, candidate, senderId, targetId },
              },
              ws
            );
          }
          break;
        }

        case 'ping': {
          sendToSocket(ws, {
            type: 'pong',
            payload: { timestamp: Date.now() },
          });
          break;
        }

        default:
          break;
      }
    } catch (err: any) {
      console.error('[WebSocket] Error processing message:', err.message);
    }
  });

  ws.on('close', () => {
    const meta = socketMetaMap.get(ws);
    if (meta && meta.roomId && meta.deviceId) {
      handleClientLeave(ws, meta.roomId, meta.deviceId);
    }
    console.log('[WebSocket] Client disconnected');
  });
});

function handleClientLeave(ws: WebSocket, roomId: string, deviceId: string) {
  unregisterSocketFromRoom(roomId, ws);

  const result = roomManager.leaveRoom(roomId, deviceId);
  if (!result) return;

  if (result.isHostLeft || result.remainingDevicesCount === 0) {
    // Room closed because host left
    broadcastToRoom(roomId, {
      type: 'room-closed',
      payload: { roomId, reason: 'Host device disconnected' },
    });
    roomSocketsMap.delete(roomId);
  } else if (result.room) {
    // Regular peer left
    broadcastToRoom(roomId, {
      type: 'device-left',
      payload: {
        deviceId,
        room: roomManager.formatRoomForClient(result.room, result.room.hostDeviceId),
      },
    });
  }
}

// Start HTTP & WebSocket server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(`🚀 DropLink Real-Time Server running on port ${PORT}`);
  console.log(`   WebSocket URL: ws://localhost:${PORT}`);
  console.log(`=================================================`);
});
