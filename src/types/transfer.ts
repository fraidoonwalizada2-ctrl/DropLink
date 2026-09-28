import type { Device } from './device';

export type TransferDirection = 'sending' | 'receiving';

export type TransferStatus =
  | 'idle'
  | 'waiting'
  | 'connecting'
  | 'preparing'
  | 'transferring'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface FileMetadata {
  id: string;
  name: string;
  size: number; // in bytes
  type: string; // MIME type
  totalChunks?: number;
  chunkSize?: number;
  lastModified?: number;
  checksum?: string; // SHA-256 hash string
}

export interface Transfer {
  id: string;
  file: FileMetadata;
  senderDevice: Device;
  receiverDevice: Device;
  direction: TransferDirection;
  status: TransferStatus;
  progress: number; // 0 to 100 percentage
  bytesTransferred: number;
  transferSpeed: number; // bytes per second
  timeRemaining?: number; // seconds remaining
  startedAt?: number;
  completedAt?: number;
  error?: string;
  rawFile?: File; // Reference to local File when sending
  downloadUrl?: string; // Object URL for downloading when receiving
  blob?: Blob;
}

// DataChannel Control Message Definitions
export type DataChannelAction =
  | 'file-meta'
  | 'file-cancel'
  | 'file-received-ack';

export interface DataChannelMetaMessage {
  action: 'file-meta';
  transferId: string;
  name: string;
  size: number;
  mimeType: string;
  totalChunks: number;
  chunkSize: number;
  checksum?: string;
}

export interface DataChannelCancelMessage {
  action: 'file-cancel';
  transferId: string;
  reason?: string;
}

export interface DataChannelAckMessage {
  action: 'file-received-ack';
  transferId: string;
  status: 'completed' | 'integrity-failed';
  error?: string;
}

export type DataChannelControlMessage =
  | DataChannelMetaMessage
  | DataChannelCancelMessage
  | DataChannelAckMessage;
