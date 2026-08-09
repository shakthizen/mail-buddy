import { describe, expect, test } from 'bun:test';
import { generateApiKey, hashApiKey } from '../../src/auth/apiKeyCrypto';

describe('apiKeyCrypto', () => {
  test('generateApiKey produces a key whose prefix is a slice of the plaintext', () => {
    const { plaintext, keyPrefix } = generateApiKey();
    expect(plaintext.startsWith('mb_')).toBe(true);
    expect(plaintext.startsWith(keyPrefix)).toBe(true);
    expect(keyPrefix.length).toBe(12);
  });

  test('hashApiKey is deterministic', () => {
    const { plaintext } = generateApiKey();
    expect(hashApiKey(plaintext)).toBe(hashApiKey(plaintext));
  });

  test('hashApiKey matches the hash produced at generation time', () => {
    const { plaintext, hashedKey } = generateApiKey();
    expect(hashApiKey(plaintext)).toBe(hashedKey);
  });

  test('different keys produce different plaintexts and hashes', () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.plaintext).not.toBe(b.plaintext);
    expect(a.hashedKey).not.toBe(b.hashedKey);
  });

  test('a single-character difference in the key produces a completely different hash', () => {
    const { plaintext } = generateApiKey();
    const tampered = plaintext.slice(0, -1) + (plaintext.at(-1) === 'a' ? 'b' : 'a');
    expect(hashApiKey(tampered)).not.toBe(hashApiKey(plaintext));
  });
});
