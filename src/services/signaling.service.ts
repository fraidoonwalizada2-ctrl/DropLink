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

  private getSocketUrl(): string {
    const envUrl = import.meta.env.VITE_SIGNALING_SERVER_URL;

    if (typeof window !== 'undefined') {
      const isLocalhost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

      // If an explicit remote URL is set in env (e.g. wss://... in production), use it
      if (envUrl && (!envUrl.includes('localhost') && !envUrl.includes('127.0.0.1') || isLocalhost)) {
        return envUrl;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // On mobile or local network (e.g. http://192.168.x.x:5173 or http://10.x.x.x:5173):
      // Use Vite proxy path /ws on the same port so mobile devices don't need port 3001 open on desktop firewall
      return `${protocol}//${window.location.host}/ws`;
    }

    return envUrl || 'ws://127.0.0.1:3001';
  }

  public connect(): Promise<boolean> {
    if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve(true);
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }

    const primaryUrl = this.getSocketUrl();
    const fallbackUrl = typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3001`
      : 'ws://127.0.0.1:3001';

    const tryConnect = (url: string, isFallback: boolean): Promise<boolean> => {
      return new Promise((resolve) => {
        try {
          console.log(`[SignalingService] Connecting to signaling server at ${url}...`);
          this.socket = new WebSocket(url);

          this.socket.onopen = () => {
            console.log(`[SignalingService] WebSocket connected successfully to ${url}`);
            this.isConnected = true;
            this.connectPromise = null;
            this.startHeartbeat();
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
            if (!isFallback && primaryUrl !== fallbackUrl) {
              console.log(`[SignalingService] Attempting fallback to ${fallbackUrl}...`);
              const fallbackSuccess = await tryConnect(fallbackUrl, true);
              resolve(fallbackSuccess);
            } else {
              this.isConnected = false;
              this.connectPromise = null;
              resolve(false);
            }
          };

          this.socket.onclose = () => {
            console.log('[SignalingService] WebSocket connection closed');
            this.isConnected = false;
            this.connectPromise = null;
            this.stopHeartbeat();
            this.emit('connection-status', {
              type: 'connection-status',
              payload: { errorType: 'CONNECTION_LOST', errorMessage: 'Lost connection to signaling server.' },
            });
          };
        } catch (err) {
          console.error('[SignalingService] Connection attempt failed:', err);
          if (!isFallback && primaryUrl !== fallbackUrl) {
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

  public disconnect(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
  }

  public async createRoomOnServer(device: Device): Promise<{ success: boolean; room?: Room; error?: string; errorType?: string }> {
    const connected = await this.connect();
    if (!connected) {
      return {
        success: false,
        errorType: 'SERVER_UNAVAILABLE',
        error: 'Unable to connect to DropLink signaling server. Make sure server is running on port 3001.',
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
        resolve: (data) => resolve({ success: true, room: data.room }),
        reject: (err) => resolve({ success: false, errorType: err.errorType, error: err.errorMessage }),
      });

      this.sendRaw(msg);

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          resolve({ success: false, errorType: 'TIMEOUT', error: 'Server response timed out.' });
        }
      }, 8000);
    });
  }

  public async joinRoomOnServer(roomCode: string, device: Device): Promise<{ success: boolean; room?: Room; error?: string; errorType?: string }> {
    const connected = await this.connect();
    if (!connected) {
      return {
        success: false,
        errorType: 'SERVER_UNAVAILABLE',
        error: 'Unable to connect to DropLink signaling server. Make sure server is running on port 3001.',
      };
    }

    const requestId = 'req_' + Math.random().toString(36).substring(2, 9);
    const msg: ClientMessage = {
      type: 'join-room',
      payload: { roomCode, device },
      requestId,
    };

    return new Promise((resolve) => {
      this.pendingRequests.set(requestId, {
        resolve: (data) => resolve({ success: true, room: data.room }),
        reject: (err) => resolve({ success: false, errorType: err.errorType, error: err.errorMessage }),
      });

      this.sendRaw(msg);

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          resolve({ success: false, errorType: 'TIMEOUT', error: 'Server response timed out.' });
        }
      }, 8000);
    });
  }

  public leaveRoomOnServer(roomId: string, deviceId: string): void {
    if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
      this.sendRaw({
        type: 'leave-room',
        payload: { roomId, deviceId },
      });
    }
  }

  public closeRoomOnServer(roomId: string, deviceId: string): void {
    if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
      this.sendRaw({
        type: 'close-room',
        payload: { roomId, deviceId },
      });
    }
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
}

export const signalingService = new SignalingService();
