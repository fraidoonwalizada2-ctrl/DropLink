/**
 * Compute SHA-256 checksum of an ArrayBuffer or Blob using Web Crypto API
 */
export async function calculateChecksum(data: ArrayBuffer | Blob): Promise<string> {
  try {
    const buffer = data instanceof ArrayBuffer ? data : await data.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.warn('[Crypto] Checksum calculation unavailable:', err);
    return '';
  }
}
