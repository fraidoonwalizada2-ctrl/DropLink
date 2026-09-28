export type SignalMessageType =
  | 'join-room'
  | 'room-joined'
  | 'device-joined'
  | 'device-left'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'transfer-header'
  | 'transfer-cancel'
  | 'error';

export interface SignalMessage {
  type: SignalMessageType;
  roomId: string;
  senderId: string;
  targetId?: string;
  payload?: any;
  timestamp: number;
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
    | 'connection-status'
    | 'pong'
    | 'error';
  payload: any;
  requestId?: string;
}

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

export type AppErrorType =
  | 'INVALID_ROOM_CODE'
  | 'ROOM_EXPIRED'
  | 'ROOM_FULL'
  | 'CONNECTION_LOST'
  | 'UNSUPPORTED_BROWSER'
  | 'FILE_TOO_LARGE'
  | 'TRANSFER_FAILED'
  | 'WEBRTC_FAILED'
  | 'UNKNOWN';

export interface AppError {
  type: AppErrorType;
  title: string;
  message: string;
  actionHint?: string;
}
