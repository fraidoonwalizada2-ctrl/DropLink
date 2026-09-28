import type { Room } from '@/types/room';
import { getLocalDeviceInfo } from '@/utils/deviceInfo';
import { signalingService } from './signaling.service';

class RoomService {
  /**
   * Real room creation request via backend WebSocket
   */
  public async createRoom(): Promise<{ success: boolean; room?: Room; error?: string; errorType?: string }> {
    const hostDevice = getLocalDeviceInfo();
    const result = await signalingService.createRoomOnServer(hostDevice);
    return result;
  }

  /**
   * Helper to format real share URL for a room code
   */
  public getRoomShareUrl(roomId: string): string {
    const cleanId = (roomId || '').trim().toUpperCase();
    if (typeof window === 'undefined') {
      const fallback = import.meta.env.VITE_APP_URL || 'https://droplink-app.vercel.app';
      return `${fallback.replace(/\/+$/, '')}/join/${cleanId}`;
    }

    let origin = window.location.origin;

    // In local development, if VITE_APP_URL is explicitly set to an IP or custom domain, use it
    const envAppUrl = import.meta.env.VITE_APP_URL;
    if (
      envAppUrl &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
      !envAppUrl.includes('localhost') &&
      !envAppUrl.includes('127.0.0.1')
    ) {
      origin = envAppUrl.replace(/\/+$/, '');
    }

    return `${origin}/join/${cleanId}`;
  }

  /**
   * Real room join request via backend WebSocket
   */
  public async joinRoom(roomId: string): Promise<{ success: boolean; room?: Room; error?: string; errorType?: string }> {
    const cleanId = (roomId || '').trim().toUpperCase();
    if (!cleanId || cleanId.length !== 6) {
      return { success: false, error: 'Room code must be 6 alphanumeric characters.', errorType: 'INVALID_ROOM_CODE' };
    }

    const currentDevice = getLocalDeviceInfo();
    const result = await signalingService.joinRoomOnServer(cleanId, currentDevice);
    return result;
  }

  /**
   * Leave room on server
   */
  public leaveRoom(roomId: string, deviceId: string): void {
    signalingService.leaveRoomOnServer(roomId, deviceId);
  }

  /**
   * Close room on server
   */
  public closeRoom(roomId: string, deviceId: string): void {
    signalingService.closeRoomOnServer(roomId, deviceId);
  }
}

export const roomService = new RoomService();
