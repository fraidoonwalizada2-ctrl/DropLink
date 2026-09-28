export const APP_NAME = 'DropLink';
export const APP_TAGLINE = 'Move anything. Anywhere.';
export const APP_DESCRIPTION = 'Transfer files between your devices without accounts, cables, or messaging apps.';

export const ROOM_CODE_LENGTH = 6;
export const DEFAULT_ROOM_EXPIRY_MINUTES = 30;

// Chunk size for WebRTC DataChannel transfer (64 KB safe binary chunk)
export const CHUNK_SIZE = 64 * 1024; // 65,536 bytes
export const BUFFER_LOW_THRESHOLD = 256 * 1024; // 256 KB backpressure threshold
export const BUFFER_MAX_THRESHOLD = 1024 * 1024; // 1 MB pause threshold

export function getIceServers(): RTCIceServer[] {
  const customStun = import.meta.env.VITE_STUN_SERVER_URL;
  const customTurn = import.meta.env.VITE_TURN_SERVER_URL;
  const turnUser = import.meta.env.VITE_TURN_USERNAME;
  const turnPass = import.meta.env.VITE_TURN_PASSWORD;

  const servers: RTCIceServer[] = [
    { urls: customStun || 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];

  if (customTurn) {
    servers.push({
      urls: customTurn,
      username: turnUser || undefined,
      credential: turnPass || undefined,
    });
  }

  return servers;
}

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = getIceServers();

export const MAX_RECOMMENDED_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
