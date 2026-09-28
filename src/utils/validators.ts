import { ROOM_CODE_LENGTH } from '@/lib/constants';

export function isValidRoomCode(code: string): boolean {
  if (!code) return false;
  const clean = code.trim().toUpperCase();
  return clean.length === ROOM_CODE_LENGTH && /^[A-Z0-9]{6}$/.test(clean);
}

export function isBrowserSupported(): { supported: boolean; reason?: string } {
  if (typeof window === 'undefined') return { supported: true };

  const hasRTCPeerConnection =
    'RTCPeerConnection' in window ||
    'webkitRTCPeerConnection' in window;
  const hasWebSocket = 'WebSocket' in window;
  const hasFileReader = 'FileReader' in window;

  if (!hasRTCPeerConnection) {
    return {
      supported: false,
      reason: 'Your browser does not support WebRTC peer-to-peer data channels.',
    };
  }

  if (!hasWebSocket) {
    return {
      supported: false,
      reason: 'Your browser does not support WebSockets required for signaling.',
    };
  }

  if (!hasFileReader) {
    return {
      supported: false,
      reason: 'Your browser does not support HTML5 File APIs.',
    };
  }

  return { supported: true };
}
