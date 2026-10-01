import type { ClientMessage, ServerMessage } from '@/types/network';
import type { Device } from '@/types/device';
import type { Room } from '@/types/room';

export type SignalingEventCallback = (msg: ServerMessage) => void;

export class SignalingService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<SignalingEventCallback>> = new Map();
  private isConnected = false;
  private connectPromise: Promise<boolean> | null = null;
  private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private pingInterval: any = null;
  private messageQueue: ClientMessage[] = [];

  // Room tracking & auto-reconnect state
  private currentRoomId: string | null = null;
  private currentDevice: Device | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private reconnectTimer: any = null;
  private isReconnecting = false;
  private isExplicitDisconnect = false;

  private getSocketUrls(): { primaryUrl: string; fallbackUrl?: string } {
    const envUrl = import.meta.env.VITE_SIGNALING_SERVER_URL;
    const defaultProductionUrl = 'wss://droplink-signaling.fraidoonwalizada2.workers.dev';

    if (typeof window !== 'undefined') {
      const isLocalhost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

      const isLocalNetwork = Boolean(
        window.location.hostname.match(
          /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/
        )
      );

      // Local development or private LAN
      if (isLocalhost || isLocalNetwork) {
        if (envUrl) {
          return { primaryUrl: envUrl, fallbackUrl: 'ws://127.0.0.1:3001' };
        }
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return {
          primaryUrl: `${protocol}//${window.location.host}/ws`,
          fallbackUrl: `${protocol}//${window.location.hostname}:3001`,
        };
      }

      // In production (Vercel or custom domain):
      // NEVER fallback to port 3001 on the public hostname!
      const prodUrl = envUrl || defaultProductionUrl;
      return {
        primaryUrl: prodUrl,
        fallbackUrl: envUrl && envUrl !== defaultProductionUrl ? defaultProductionUrl : undefined,
      };
    }

    return { primaryUrl: envUrl || defaultProductionUrl };
  }

  public connect(): Promise<boolean> {
    if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve(true);
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.isExplicitDisconnect = false;
    const { primaryUrl, fallbackUrl } = this.getSocketUrls();

    const tryConnect = (url: string, isFallback: boolean): Promise<boolean> => {
      return new Promise((resolve) => {
        try {
          console.log(`[SignalingService] Connecting to signaling server at ${url}...`);
          this.socket = new WebSocket(url);

          this.socket.onopen = () => {
            console.log(`[SignalingService] WebSocket connected successfully to ${url}`);
            this.isConnected = true;
            this.connectPromise = null;
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
            this.flushMessageQueue();
            this.startHeartbeat();
            this.emit('connection-status', {
              type: 'connection-status',
              payload: { status: 'connected' },
            });
            resolve(true);
          };

          this.socket.onmessage = (event) => {
            try {
              const msg: ServerMessage = JSON.parse(event.data);
              this.handleServerMessage(msg);
            } catch (e) {
              console.error('[SignalingService] Error parsing socket message:', e);
            }
          };

          this.socket.onerror = async (err) => {
            console.warn(`[SignalingService] WebSocket error on ${url}:`, err);
            if (!isFallback && fallbackUrl && primaryUrl !== fallbackUrl) {
              console.log(`[SignalingService] Attempting fallback to ${fallbackUrl}...`);
              const fallbackSuccess = await tryConnect(fallbackUrl, true);
              resolve(fallbackSuccess);
            } else {
              this.isConnected = false;
              this.connectPromise = null;
              resolve(false);
            }
          };

          this.socket.onclose = (event) => {
            console.log(`[SignalingService] WebSocket connection closed (code: ${event.code}, reason: ${event.reason || 'none'})`);
            this.isConnected = false;
            this.connectPromise = null;
            this.stopHeartbeat();
            this.emit('connection-status', {
              type: 'connection-status',
              payload: { status: 'disconnected', errorType: 'CONNECTION_LOST', errorMessage: 'Lost connection to signaling server.' },
            });

            if (!this.isExplicitDisconnect) {
              this.scheduleReconnect();
            }
          };
        } catch (err) {
          console.error('[SignalingService] Connection attempt failed:', err);
          if (!isFallback && fallbackUrl && primaryUrl !== fallbackUrl) {
            tryConnect(fallbackUrl, true).then(resolve);
          } else {
            this.isConnected = false;
            this.connectPromise = null;
            resolve(false);
          }
        }
      });
    };

    this.connectPromise = tryConnect(primaryUrl, false);
    return this.connectPromise;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isExplicitDisconnect) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(`[SignalingService] Max reconnect attempts (${this.maxReconnectAttempts}) reached.`);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectAttempts * 1000, 5000);
    console.log(`[SignalingService] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
    this.isReconnecting = true;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.isExplicitDisconnect) return;

      console.log(`[SignalingService] Executing reconnect attempt ${this.reconnectAttempts}...`);
      const success = await this.connect();
      if (success) {
        console.log(`[SignalingService] Reconnection successful.`);
        this.isReconnecting = false;
        this.reconnectAttempts = 0;

        // Auto-rejoin active room if user was in a room
        if (this.currentRoomId && this.currentDevice) {
          console.log(`[SignalingService] Auto-rejoining room ${this.currentRoomId} following reconnection...`);
          try {
            const rejoinResult = await this.joinRoomOnServer(this.currentRoomId, this.currentDevice);
            if (rejoinResult.success && rejoinResult.room) {
              console.log(`[SignalingService] Successfully auto-rejoined room ${this.currentRoomId}`);
              this.emit('room-joined', {
                type: 'room-joined',
                payload: { room: rejoinResult.room },
              });
            }
          } catch (e) {
            console.error(`[SignalingService] Auto-rejoin failed:`, e);
          }
        }
      } else {
        this.scheduleReconnect();
      }
    }, delay);
  }

  public disconnect(): void {
    this.isExplicitDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.connectPromise = null;
  }

  public async createRoomOnServer(device: Device): Promise<{ success: boolean; room?: Room; error?: string; errorType?: string }> {
    console.log(`[Room] Creating room for device: ${device.name} (${device.id})`);
    const connected = await this.connect();
    if (!connected) {
      console.warn(`[Room] Connection failed when attempting to create room`);
      return {
        success: false,
        errorType: 'SERVER_UNAVAILABLE',
        error: 'Unable to connect to DropLink signaling server. Check your network connection.',
      };
    }

    const requestId = 'req_' + Math.random().toString(36).substring(2, 9);
    const msg: ClientMessage = {
      type: 'create-room',
      payload: { device },
      requestId,
    };

    return new Promise((resolve) => {
      this.pendingRequests.set(requestId, {
        resolve: (data) => {
          if (data?.room?.id) {
            this.currentRoomId = data.room.id;
            this.currentDevice = device;
            console.log(`[Room] Created: ${data.room.id}`);
            const origin = typeof window !== 'undefined' ? window.location.origin : 'https://droplink-app.vercel.app';
            console.log(`[Room] QR URL: ${origin}/join/${data.room.id}`);
          }
          resolve({ success: true, room: data.room });
        },
        reject: (err) => {
          console.warn(`[Room] Create rejected:`, err);
          resolve({ success: false, errorType: err.errorType, error: err.errorMessage });
        },
      });

      this.sendRaw(msg);

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          resolve({ success: false, errorType: 'TIMEOUT', error: 'Server response timed out.' });
        }
      }, 10000);
    });
  }

  public async joinRoomOnServer(roomCode: string, device: Device): Promise<{ success: boolean; room?: Room; error?: string; errorType?: string }> {
    const cleanCode = (roomCode || '').trim().toUpperCase();
    console.log(`[Room] Joining room: ${cleanCode}`);

    const connected = await this.connect();
    const wsState = this.socket
      ? ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][this.socket.readyState] || 'UNKNOWN'
      : 'NULL';
    console.log(`[Room] WebSocket state: ${wsState}`);

    if (!connected) {
      console.warn(`[Room] JOIN rejected reason: SERVER_UNAVAILABLE`);
      return {
        success: false,
        errorType: 'SERVER_UNAVAILABLE',
        error: 'Unable to connect to DropLink signaling server. Check your network connection.',
      };
    }

    console.log(`[Room] Sending JOIN: ${cleanCode}`);
    const requestId = 'req_' + Math.random().toString(36).substring(2, 9);
    const msg: ClientMessage = {
      type: 'join-room',
      payload: { roomCode: cleanCode, device },
      requestId,
    };

    return new Promise((resolve) => {
      this.pendingRequests.set(requestId, {
        resolve: (data) => {
          console.log(`[Room] JOIN accepted: ${cleanCode}`);
          this.currentRoomId = cleanCode;
          this.currentDevice = device;
          resolve({ success: true, room: data.room });
        },
        reject: (err) => {
          console.warn(`[Room] JOIN rejected reason: ${err.errorType || 'ERROR'} - ${err.errorMessage || err}`);
          resolve({ success: false, errorType: err.errorType, error: err.errorMessage });
        },
      });

      this.sendRaw(msg);

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          console.warn(`[Room] JOIN rejected reason: TIMEOUT`);
          resolve({ success: false, errorType: 'TIMEOUT', error: 'Server response timed out.' });
        }
      }, 10000);
    });
  }

  public leaveRoomOnServer(roomId: string, deviceId: string): void {
    if (this.currentRoomId === roomId.trim().toUpperCase()) {
      this.currentRoomId = null;
    }
    this.sendRaw({
      type: 'leave-room',
      payload: { roomId, deviceId },
    });
  }

  public closeRoomOnServer(roomId: string, deviceId: string): void {
    if (this.currentRoomId === roomId.trim().toUpperCase()) {
      this.currentRoomId = null;
    }
    this.sendRaw({
      type: 'close-room',
      payload: { roomId, deviceId },
    });
  }

  // WebRTC Signaling Relay Methods
  public sendOffer(roomId: string, sdp: RTCSessionDescriptionInit, senderId: string, targetId?: string): void {
    this.sendRaw({
      type: 'webrtc-offer',
      payload: { roomId, sdp, senderId, targetId },
    });
  }

  public sendAnswer(roomId: string, sdp: RTCSessionDescriptionInit, senderId: string, targetId?: string): void {
    this.sendRaw({
      type: 'webrtc-answer',
      payload: { roomId, sdp, senderId, targetId },
    });
  }

  public sendIceCandidate(roomId: string, candidate: RTCIceCandidateInit, senderId: string, targetId?: string): void {
    this.sendRaw({
      type: 'webrtc-ice',
      payload: { roomId, candidate, senderId, targetId },
    });
  }

  private sendRaw(msg: ClientMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    } else {
      console.log(`[SignalingService] Socket not ready (state: ${this.socket?.readyState ?? 'null'}), queuing message:`, msg.type);
      this.messageQueue.push(msg);
      this.connect();
    }
  }

  private flushMessageQueue(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.messageQueue.length > 0) {
      console.log(`[SignalingService] Flushing ${this.messageQueue.length} queued messages`);
      const queue = [...this.messageQueue];
      this.messageQueue = [];
      for (const msg of queue) {
        this.socket.send(JSON.stringify(msg));
      }
    }
  }

  private handleServerMessage(msg: ServerMessage): void {
    if (msg.requestId && this.pendingRequests.has(msg.requestId)) {
      const handler = this.pendingRequests.get(msg.requestId)!;
      this.pendingRequests.delete(msg.requestId);

      if (msg.type === 'error') {
        handler.reject(msg.payload);
      } else {
        handler.resolve(msg.payload);
      }
    }

    this.emit(msg.type, msg);
  }

  public on(event: string, callback: SignalingEventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: SignalingEventCallback): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  private emit(event: string, msg: ServerMessage): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const cb of callbacks) {
        cb(msg);
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
        this.sendRaw({ type: 'ping', payload: {} });
      }
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public getIsReconnecting(): boolean {
    return this.isReconnecting;
  }

  public getCurrentRoomId(): string | null {
    return this.currentRoomId;
  }
}

export const signalingService = new SignalingService();
