// Safe alphabet without ambiguous characters (0, O, 1, I)
const SAFE_ROOM_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateUniqueRoomCode(existingCodes: Set<string>): string {
  const maxAttempts = 1000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * SAFE_ROOM_CHARS.length);
      code += SAFE_ROOM_CHARS.charAt(randomIndex);
    }
    if (!existingCodes.has(code)) {
      return code;
    }
  }
  // Fallback timestamp code if collision threshold reached
  return 'R' + Date.now().toString(36).substring(3, 8).toUpperCase();
}

export function isValidRoomCodeFormat(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const clean = code.trim().toUpperCase();
  return clean.length === 6 && /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(clean);
}
