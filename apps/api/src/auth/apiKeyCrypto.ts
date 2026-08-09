const KEY_PREFIX = 'mb_';

/** SHA-256 is used (not bcrypt) because API keys already carry high entropy —
 * this needs to be a fast, deterministic lookup on every request, not a
 * slow password hash. Uses Bun's native CryptoHasher rather than node:crypto. */
export function hashApiKey(plaintext: string): string {
  return new Bun.CryptoHasher('sha256').update(plaintext).digest('hex');
}

export function generateApiKey(): { plaintext: string; hashedKey: string; keyPrefix: string } {
  const random = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64url');
  const plaintext = `${KEY_PREFIX}${random}`;
  return {
    plaintext,
    hashedKey: hashApiKey(plaintext),
    keyPrefix: plaintext.slice(0, 12),
  };
}
