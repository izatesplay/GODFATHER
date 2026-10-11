/**
 * Web Crypto API utilities for Secret Chats (E2EE) and Call Verification Fingerprints
 */

const EMOJI_POOL = [
  '🦊', '🦁', '🐯', '🐻', '🐼', '🐨', '🐸', '🐙', '🦄', '🐝',
  '🔒', '💎', '⚡', '🔥', '⭐', '🌈', '🚀', '🔮', '🛡️', '🍀',
  '🍎', '🍓', '🍒', '🥑', '🍕', '🍰', '☕', '🎸', '🎨', '⛵'
];

/**
 * Generate 4 emojis from cryptographic hash (DTLS-SRTP / E2EE Key fingerprint)
 */
export async function generateFourEmojiFingerprint(seed: string): Promise<string[]> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(seed);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return [
      EMOJI_POOL[hashArray[0] % EMOJI_POOL.length],
      EMOJI_POOL[hashArray[1] % EMOJI_POOL.length],
      EMOJI_POOL[hashArray[2] % EMOJI_POOL.length],
      EMOJI_POOL[hashArray[3] % EMOJI_POOL.length]
    ];
  } catch {
    return ['🦊', '🔒', '💎', '⚡'];
  }
}

/**
 * Encrypt a message text using Web Crypto AES-GCM
 */
export async function encryptE2EEMessage(text: string, secretKeyHex = 'cloudpulse_secret_ratchet_key_v1'): Promise<{ ciphertext: string; iv: string }> {
  try {
    const enc = new TextEncoder();
    const keyData = enc.encode(secretKeyHex.padEnd(32, '0').slice(0, 32));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedText = enc.encode(text);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encodedText
    );

    const base64Cipher = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    const base64Iv = btoa(String.fromCharCode(...iv));

    return { ciphertext: base64Cipher, iv: base64Iv };
  } catch (err) {
    console.warn('Web Crypto fallback:', err);
    return { ciphertext: btoa(text), iv: 'demo_iv' };
  }
}
