import { RoomRecord, DeviceInfo, RoomStatus } from '../types/index.js';
import { generateUniqueRoomCode, isValidRoomCodeFormat } from '../utils/codeGenerator.js';

export class RoomManager {
  private rooms: Map<string, RoomRecord> = new Map(); // Key: 6-char room code
  private roomCodeSet: Set<string> = new Set();
  private DEFAULT_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes lifetime
  private INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes inactivity

  constructor() {
    // Periodically clean up expired rooms every 10 seconds
    setInterval(() => this.cleanupExpiredRooms(), 10000);
  }

  /**
   * Creates a new temporary room
   */
  public createRoom(hostDevice: DeviceInfo): RoomRecord {
    const code = generateUniqueRoomCode(this.roomCodeSet);
    const now = Date.now();

    const room: RoomRecord = {
      id: code,
      internalId: 'rm_' + Math.random().toString(36).substring(2, 9),
      createdAt: now,
      expiresAt: now + this.DEFAULT_EXPIRY_MS,
      lastActivityAt: now,
      status: 'waiting',
      hostDeviceId: hostDevice.id,
      devices: new Map(),
      maxDevices: 2,
    };

    // Ensure status for host device is connected
    const hostWithStatus: DeviceInfo = {
      ...hostDevice,
      status: 'connected',
      joinedAt: now,
    };

    room.devices.set(hostDevice.id, hostWithStatus);
    this.rooms.set(code, room);
    this.roomCodeSet.add(code);

    return room;
  }

  /**
   * Join an existing room by 6-character code
   */
  public joinRoom(
    code: string,
    joiningDevice: DeviceInfo
  ): { success: boolean; room?: RoomRecord; errorType?: string; errorMessage?: string } {
    const cleanCode = (code || '').trim().toUpperCase();

    if (!isValidRoomCodeFormat(cleanCode)) {
      return {
        success: false,
        errorType: 'INVALID_ROOM_CODE',
        errorMessage: 'Room code must be 6 alphanumeric characters.',
      };
    }

    const room = this.rooms.get(cleanCode);

    if (!room) {
      return {
        success: false,
        errorType: 'ROOM_NOT_FOUND',
        errorMessage: 'Room not found. Check the code and try again.',
      };
    }

    const now = Date.now();
    if (now > room.expiresAt || room.status === 'expired') {
      this.closeRoom(cleanCode);
      return {
        success: false,
        errorType: 'ROOM_EXPIRED',
        errorMessage: 'This transfer room has expired.',
      };
    }

    if (room.status === 'closed') {
      return {
        success: false,
        errorType: 'ROOM_CLOSED',
        errorMessage: 'This transfer room has been closed by the host.',
      };
    }

    const isExistingMember = room.devices.has(joiningDevice.id);

    // Check capacity if device is not already in the room
    if (!isExistingMember && room.devices.size >= room.maxDevices) {
      return {
        success: false,
        errorType: 'ROOM_FULL',
        errorMessage: 'Room is full. Maximum 2 devices allowed.',
      };
    }

    // Add or reconnect device
    const existingDev = room.devices.get(joiningDevice.id);
    const deviceWithStatus: DeviceInfo = {
      ...joiningDevice,
      status: 'connected',
      joinedAt: existingDev?.joinedAt || now,
    };

    room.devices.set(joiningDevice.id, deviceWithStatus);
    room.lastActivityAt = now;

    if (room.devices.size >= 2) {
      room.status = 'connected';
    }

    return { success: true, room };
  }

  /**
   * Get room by code
   */
  public getRoom(code: string): RoomRecord | undefined {
    return this.rooms.get(code.trim().toUpperCase());
  }

  /**
   * Handle temporary socket disconnection without destroying room
   */
  public markDeviceDisconnected(
    code: string,
    deviceId: string
  ): { room?: RoomRecord; isHost: boolean } | null {
    const cleanCode = code.trim().toUpperCase();
    const room = this.rooms.get(cleanCode);
    if (!room) return null;

    const dev = room.devices.get(deviceId);
    if (dev) {
      dev.status = 'disconnected';
    }
    room.lastActivityAt = Date.now();

    return { room, isHost: room.hostDeviceId === deviceId };
  }

  /**
   * Handle explicit device leave
   */
  public leaveRoom(
    code: string,
    deviceId: string
  ): { room?: RoomRecord; isHostLeft: boolean; remainingDevicesCount: number } | null {
    const cleanCode = code.trim().toUpperCase();
    const room = this.rooms.get(cleanCode);
    if (!room) return null;

    const isHostLeft = room.hostDeviceId === deviceId;
    room.devices.delete(deviceId);
    room.lastActivityAt = Date.now();

    if (room.devices.size < 2 && room.status === 'connected') {
      room.status = 'waiting';
    }

    if (room.devices.size === 0) {
      this.closeRoom(cleanCode);
      return { room, isHostLeft, remainingDevicesCount: 0 };
    }

    return { room, isHostLeft, remainingDevicesCount: room.devices.size };
  }

  /**
   * Close and destroy a room (explicit host close or expiry)
   */
  public closeRoom(code: string): boolean {
    const cleanCode = code.trim().toUpperCase();
    const room = this.rooms.get(cleanCode);
    if (!room) return false;

    room.status = 'closed';
    this.rooms.delete(cleanCode);
    this.roomCodeSet.delete(cleanCode);
    return true;
  }

  /**
   * Serializes a RoomRecord into a JSON-friendly object for clients
   */
  public formatRoomForClient(room: RoomRecord, forDeviceId: string): any {
    const devicesList: DeviceInfo[] = [];

    for (const [id, dev] of room.devices.entries()) {
      devicesList.push({
        ...dev,
        isSelf: id === forDeviceId,
      });
    }

    return {
      id: room.id,
      internalId: room.internalId,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt,
      status: room.status,
      hostDeviceId: room.hostDeviceId,
      connectedDevices: devicesList,
      maxDevices: room.maxDevices,
      isBackendConnected: true,
    };
  }

  /**
   * Periodic cleanup of stale/expired rooms
   */
  private cleanupExpiredRooms(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      if (now > room.expiresAt || now - room.lastActivityAt > this.INACTIVITY_TIMEOUT_MS) {
        console.log(`[RoomManager] Cleaning up expired room: ${code}`);
        this.closeRoom(code);
      }
    }
  }
}

export const roomManager = new RoomManager();
