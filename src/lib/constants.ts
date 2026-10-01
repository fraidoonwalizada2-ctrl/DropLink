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
  const stunUrls: string[] = [];

  const customStun = import.meta.env.VITE_STUN_SERVER_URL;
  if (customStun && typeof customStun === 'string') {
    const customList = customStun
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    stunUrls.push(...customList);
  }

  const defaultStuns = [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
    'stun:stun.cloudflare.com:3478',
  ];

  for (const stun of defaultStuns) {
    if (!stunUrls.includes(stun)) {
      stunUrls.push(stun);
    }
  }

  const servers: RTCIceServer[] = [
    {
      urls: stunUrls,
    },
  ];

  // Collect TURN URLs from VITE_TURN_SERVER_URLS and VITE_TURN_SERVER_URL
  const turnUrls: string[] = [];
  const multiTurn = import.meta.env.VITE_TURN_SERVER_URLS;
  if (multiTurn && typeof multiTurn === 'string') {
    const list = multiTurn
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
    turnUrls.push(...list);
  }

  const singleTurn = import.meta.env.VITE_TURN_SERVER_URL;
  if (singleTurn && typeof singleTurn === 'string') {
    const clean = singleTurn.trim();
    if (clean && !turnUrls.includes(clean)) {
      turnUrls.push(clean);
    }
  }

  const turnUsername = (import.meta.env.VITE_TURN_USERNAME || '').trim();
  const turnCredential = (
    import.meta.env.VITE_TURN_CREDENTIAL ||
    import.meta.env.VITE_TURN_PASSWORD ||
    ''
  ).trim();

  // Only configure TURN if valid URLs AND authentication credentials are present
  if (turnUrls.length > 0 && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrls,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return servers;
}

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = getIceServers();

export const MAX_RECOMMENDED_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
