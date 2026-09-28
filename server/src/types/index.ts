export type DeviceType = 'mobile' | 'desktop' | 'tablet' | 'unknown';
export type OSType = 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'unknown';
export type BrowserType = 'chrome' | 'safari' | 'firefox' | 'edge' | 'opera' | 'unknown';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed' | 'reconnecting';

export interface DeviceInfo {
  id: string;
  name: string;
  type: DeviceType;
  os: OSType;
  browser: BrowserType;
  isSelf?: boolean;
  status: ConnectionStatus;
  joinedAt: number;
}

export type RoomStatus = 'waiting' | 'connected' | 'expired' | 'closed';

export interface RoomRecord {
  id: string; // 6-character code (e.g. A7K9PX)
  internalId: string;
  createdAt: number;
  expiresAt: number;
  lastActivityAt: number;
  status: RoomStatus;
  hostDeviceId: string;
  devices: Map<string, DeviceInfo>; // Map deviceId -> DeviceInfo
  maxDevices: number;
}

export interface ClientMessage {
  type:
    | 'create-room'
    | 'join-room'
    | 'leave-room'
    | 'close-room'
    | 'webrtc-offer'
    | 'webrtc-answer'
    | 'webrtc-ice'
    | 'ping';
  payload: any;
  requestId?: string;
}

export interface ServerMessage {
  type:
    | 'room-created'
    | 'room-joined'
    | 'device-joined'
    | 'device-left'
    | 'room-closed'
    | 'room-expired'
    | 'webrtc-offer'
    | 'webrtc-answer'
    | 'webrtc-ice'
    | 'pong'
    | 'error';
  payload: any;
  requestId?: string;
}
