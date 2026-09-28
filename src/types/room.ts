export type RoomStatus =
  | 'created'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'expired'
  | 'closed';

import type { Device } from './device';

export interface Room {
  id: string; // 6-character code (e.g. K7X9P2)
  internalId?: string;
  createdAt: number;
  expiresAt: number;
  status: RoomStatus;
  hostDevice?: Device;
  hostDeviceId?: string;
  connectedDevices: Device[];
  maxDevices: number;
  qrCodeUrl?: string;
  isBackendConnected: boolean;
}

export interface CreateRoomOptions {
  customId?: string;
  maxDevices?: number;
}
