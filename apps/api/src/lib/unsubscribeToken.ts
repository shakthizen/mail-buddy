import { timingSafeEqual } from 'node:crypto';
import { getServerSecret } from './serverSecret';

interface UnsubscribeTokenPayload {
  email: string;
  templateId: string | null;
}

/** HMAC-SHA256 via Bun's native CryptoHasher (second constructor arg = HMAC key). */
function sign(payload: string): string {
  return new Bun.CryptoHasher('sha256', getServerSecret()).update(payload).digest('base64url');
}

/** Encodes email + templateId into a URL-safe, HMAC-signed token for the public unsubscribe link. */
export function createUnsubscribeToken({ email, templateId }: UnsubscribeTokenPayload): string {
  const body = Buffer.from(JSON.stringify({ e: email, t: templateId })).toString('base64url');
  const signature = sign(body);
  return `${body}.${signature}`;
}

/** Verifies and decodes a token from createUnsubscribeToken. Returns null if invalid/tampered. */
export function verifyUnsubscribeToken(token: string): UnsubscribeTokenPayload | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return { email: decoded.e, templateId: decoded.t ?? null };
  } catch {
    return null;
  }
}
