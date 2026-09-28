import { DurableObject } from 'cloudflare:workers';
import type {
  ClientMessage,
  ServerMessage,
  DeviceInfo,
  RoomRecord,
  SocketMetadata,
} from './types';
import { generateUniqueRoomCode, isValidRoomCodeFormat } from './codeGenerator';

export interface Env {
  SIGNALING_ROOM: DurableObjectNamespace<SignalingRoom>;
}

export class SignalingRoom extends DurableObject<Env> {
  // In-memory cache of active rooms
  private rooms: Map<string, RoomRecord> = new Map();
  private readonly DEFAULT_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes lifetime
  private readonly INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes inactivity

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  /**
   * Handle incoming HTTP fetch (specifically WebSocket upgrades forwarded from worker fetch)
   */
  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept WebSocket into Durable Object hibernation runtime
    this.ctx.acceptWebSocket(server);

    // Set initial metadata
    server.serializeAttachment({
      deviceId: '',
      roomId: '',
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Cloudflare Durable Object WebSocket Hibernation Event Handlers
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      this.cleanupStaleRooms();

      const msgStr = typeof message === 'string' ? message : new TextDecoder().decode(message);
      const parsed: ClientMessage = JSON.parse(msgStr);
      await this.handleClientMessage(ws, parsed);
    } catch (err: any) {
      console.error('[SignalingRoom] Failed to handle message:', err?.message || err);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    const meta: SocketMetadata = ws.deserializeAttachment() || {};
    if (meta.roomId && meta.deviceId) {
      this.handleClientLeave(ws, meta.roomId, meta.deviceId);
    }
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('[SignalingRoom] WebSocket error:', error);
  }

  /**
   * Main protocol message dispatcher
   */
  private async handleClientMessage(ws: WebSocket, message: ClientMessage): Promise<void> {
    const meta: SocketMetadata = ws.deserializeAttachment() || {};

    switch (message.type) {
      case 'create-room': {
        const { device } = message.payload || {};
        if (!device || !device.id) {
          this.sendToSocket(ws, {
            type: 'error',
            requestId: message.requestId,
            payload: { errorType: 'INVALID_DEVICE', errorMessage: 'Invalid device information.' },
          });
          return;
        }

        const existingCodes = new Set(this.rooms.keys());
        const code = generateUniqueRoomCode(existingCodes);
        const now = Date.now();

        const hostWithStatus: DeviceInfo = {
          ...device,
          status: 'connected',
          joinedAt: now,
        };

        const room: RoomRecord = {
          id: code,
          internalId: 'rm_' + Math.random().toString(36).substring(2, 9),
          createdAt: now,
          expiresAt: now + this.DEFAULT_EXPIRY_MS,
          lastActivityAt: now,
          status: 'waiting',
          hostDeviceId: device.id,
          devices: {
            [device.id]: hostWithStatus,
          },
          maxDevices: 2,
        };

        this.rooms.set(code, room);

        meta.deviceId = device.id;
        meta.roomId = code;
        meta.deviceInfo = hostWithStatus;
        ws.serializeAttachment(meta);

        console.log(`[SignalingRoom] Created room ${code} for host ${device.name}`);

        this.sendToSocket(ws, {
          type: 'room-created',
          requestId: message.requestId,
          payload: {
            room: this.formatRoomForClient(room, device.id),
          },
        });
        break;
      }

      case 'join-room': {
        const { roomCode, device } = message.payload || {};
        if (!roomCode || !device || !device.id) {
          this.sendToSocket(ws, {
            type: 'error',
            requestId: message.requestId,
            payload: { errorType: 'INVALID_REQUEST', errorMessage: 'Missing room code or device info.' },
          });
          return;
        }

        const cleanCode = (roomCode || '').trim().toUpperCase();

        if (!isValidRoomCodeFormat(cleanCode)) {
          this.sendToSocket(ws, {
            type: 'error',
            requestId: message.requestId,
            payload: { errorType: 'INVALID_ROOM_CODE', errorMessage: 'Room code must be 6 alphanumeric characters.' },
          });
          return;
        }

        const room = this.rooms.get(cleanCode);

        if (!room) {
          this.sendToSocket(ws, {
            type: 'error',
            requestId: message.requestId,
            payload: { errorType: 'ROOM_NOT_FOUND', errorMessage: 'Room not found. Check the code and try again.' },
          });
          return;
        }

        const now = Date.now();
        if (now > room.expiresAt || room.status === 'expired') {
          this.rooms.delete(cleanCode);
          this.sendToSocket(ws, {
            type: 'error',
            requestId: message.requestId,
            payload: { errorType: 'ROOM_EXPIRED', errorMessage: 'This transfer room has expired.' },
          });
          return;
        }

        if (room.status === 'closed') {
          this.sendToSocket(ws, {
            type: 'error',
            requestId: message.requestId,
            payload: { errorType: 'ROOM_CLOSED', errorMessage: 'This transfer room has been closed by the host.' },
          });
          return;
        }

        const deviceCount = Object.keys(room.devices).length;
        if (!room.devices[device.id] && deviceCount >= room.maxDevices) {
          this.sendToSocket(ws, {
            type: 'error',
            requestId: message.requestId,
            payload: { errorType: 'ROOM_FULL', errorMessage: 'Room is full. Maximum 2 devices allowed.' },
          });
          return;
        }

        const deviceWithStatus: DeviceInfo = {
          ...device,
          status: 'connected',
          joinedAt: now,
        };

        room.devices[device.id] = deviceWithStatus;
        room.lastActivityAt = now;

        if (Object.keys(room.devices).length >= 2) {
          room.status = 'connected';
        }

        meta.deviceId = device.id;
        meta.roomId = cleanCode;
        meta.deviceInfo = deviceWithStatus;
        ws.serializeAttachment(meta);

        console.log(`[SignalingRoom] Device ${device.name} joined room ${cleanCode}`);

        // Confirm to joining device
        this.sendToSocket(ws, {
          type: 'room-joined',
          requestId: message.requestId,
          payload: {
            room: this.formatRoomForClient(room, device.id),
          },
        });

        // Broadcast to other device in the room
        this.broadcastToRoom(
          cleanCode,
          {
            type: 'device-joined',
            payload: {
              device: { ...device, isSelf: false, status: 'connected' },
              room: this.formatRoomForClient(room, room.hostDeviceId),
            },
          },
          ws
        );
        break;
      }

      case 'leave-room': {
        const { roomId, deviceId } = message.payload || {};
        if (roomId && deviceId) {
          this.handleClientLeave(ws, roomId, deviceId);
        }
        break;
      }

      case 'close-room': {
        const { roomId, deviceId } = message.payload || {};
        if (roomId) {
          const cleanCode = roomId.trim().toUpperCase();
          const room = this.rooms.get(cleanCode);
          if (room && room.hostDeviceId === deviceId) {
            console.log(`[SignalingRoom] Host closed room ${cleanCode}`);

            this.broadcastToRoom(cleanCode, {
              type: 'room-closed',
              payload: { roomId: cleanCode, reason: 'Room closed by host' },
            });

            this.rooms.delete(cleanCode);
          }
        }
        break;
      }

      case 'webrtc-offer': {
        const { roomId, sdp, senderId, targetId } = message.payload || {};
        if (roomId && sdp) {
          this.broadcastToRoom(
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
          this.broadcastToRoom(
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
          this.broadcastToRoom(
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
        this.sendToSocket(ws, {
          type: 'pong',
          payload: { timestamp: Date.now() },
        });
        break;
      }

      default:
        break;
    }
  }

  private handleClientLeave(ws: WebSocket, roomId: string, deviceId: string): void {
    try {
      ws.serializeAttachment({ deviceId: '', roomId: '' });
    } catch {}

    const cleanCode = roomId.trim().toUpperCase();
    const room = this.rooms.get(cleanCode);
    if (!room) return;

    const isHostLeft = room.hostDeviceId === deviceId;
    delete room.devices[deviceId];
    room.lastActivityAt = Date.now();

    const remainingCount = Object.keys(room.devices).length;

    if (isHostLeft || remainingCount === 0) {
      this.broadcastToRoom(cleanCode, {
        type: 'room-closed',
        payload: { roomId: cleanCode, reason: 'Host device disconnected' },
      });
      this.rooms.delete(cleanCode);
    } else {
      if (remainingCount < 2 && room.status === 'connected') {
        room.status = 'waiting';
      }
      this.broadcastToRoom(cleanCode, {
        type: 'device-left',
        payload: {
          deviceId,
          room: this.formatRoomForClient(room, room.hostDeviceId),
        },
      });
    }
  }

  private sendToSocket(ws: WebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (err: any) {
      console.error('[SignalingRoom] Failed to send message to socket:', err?.message || err);
    }
  }

  private broadcastToRoom(roomId: string, message: ServerMessage, excludeSocket?: WebSocket): void {
    const cleanCode = roomId.trim().toUpperCase();
    const payloadStr = JSON.stringify(message);
    const sockets = this.ctx.getWebSockets();

    for (const clientSocket of sockets) {
      if (clientSocket === excludeSocket) continue;

      try {
        const meta = clientSocket.deserializeAttachment() as SocketMetadata | null;
        if (meta?.roomId?.trim().toUpperCase() === cleanCode) {
          clientSocket.send(payloadStr);
        }
      } catch (err: any) {
        console.error('[SignalingRoom] Broadcast error for socket:', err?.message || err);
      }
    }
  }

  private formatRoomForClient(room: RoomRecord, forDeviceId: string): any {
    const connectedDevices = Object.values(room.devices).map((dev) => ({
      ...dev,
      isSelf: dev.id === forDeviceId,
    }));

    return {
      id: room.id,
      internalId: room.internalId,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt,
      status: room.status,
      hostDeviceId: room.hostDeviceId,
      connectedDevices,
      maxDevices: room.maxDevices,
      isBackendConnected: true,
    };
  }

  private cleanupStaleRooms(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      if (now > room.expiresAt || now - room.lastActivityAt > this.INACTIVITY_TIMEOUT_MS) {
        this.rooms.delete(code);
      }
    }
  }
}
