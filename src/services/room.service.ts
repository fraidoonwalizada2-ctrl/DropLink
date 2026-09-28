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
    if (typeof window === 'undefined') return `https://droplink.app/join/${roomId.toUpperCase()}`;
    const origin = window.location.origin;
    return `${origin}/join/${roomId.toUpperCase()}`;
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
