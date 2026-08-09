import { describe, expect, test } from 'bun:test';
import { createUnsubscribeToken, verifyUnsubscribeToken } from '../../src/lib/unsubscribeToken';

describe('unsubscribe token', () => {
  test('round-trips email and templateId', () => {
    const token = createUnsubscribeToken({ email: 'a@example.com', templateId: 't1' });
    const payload = verifyUnsubscribeToken(token);
    expect(payload).toEqual({ email: 'a@example.com', templateId: 't1' });
  });

  test('round-trips a global (null templateId) token', () => {
    const token = createUnsubscribeToken({ email: 'a@example.com', templateId: null });
    const payload = verifyUnsubscribeToken(token);
    expect(payload).toEqual({ email: 'a@example.com', templateId: null });
  });

  test('rejects a token with a flipped signature byte', () => {
    const token = createUnsubscribeToken({ email: 'a@example.com', templateId: 't1' });
    const [body, signature] = token.split('.');
    const tamperedSig = signature.slice(0, -1) + (signature.at(-1) === 'a' ? 'b' : 'a');
    expect(verifyUnsubscribeToken(`${body}.${tamperedSig}`)).toBeNull();
  });

  test('rejects a token whose body was swapped to a different email (signature mismatch)', () => {
    const tokenA = createUnsubscribeToken({ email: 'a@example.com', templateId: 't1' });
    const tokenB = createUnsubscribeToken({ email: 'b@example.com', templateId: 't1' });
    const [, signatureA] = tokenA.split('.');
    const [bodyB] = tokenB.split('.');
    // Attacker tries to reuse A's signature with B's body (or vice versa) - must fail.
    expect(verifyUnsubscribeToken(`${bodyB}.${signatureA}`)).toBeNull();
  });

  test('rejects malformed tokens', () => {
    expect(verifyUnsubscribeToken('not-a-real-token')).toBeNull();
    expect(verifyUnsubscribeToken('')).toBeNull();
    expect(verifyUnsubscribeToken('only-one-part.')).toBeNull();
  });
});
