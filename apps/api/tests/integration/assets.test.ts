import { describe, expect, test, afterAll, beforeEach } from 'bun:test';
import { rm } from 'node:fs/promises';
import { buildTestApp, seedApiKey, authHeaders, resetDb } from '../helpers';

beforeEach(resetDb);

// 1x1 transparent PNG, well under the 1024-byte test limit set in tests/setup.ts.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function tinyPngFile(name = 'pixel.png') {
  const bytes = Uint8Array.from(atob(TINY_PNG_BASE64), (c) => c.charCodeAt(0));
  return new File([bytes], name, { type: 'image/png' });
}

async function uploadRequest(app: ReturnType<typeof buildTestApp>, apiKey: string, file: File) {
  const formData = new FormData();
  formData.set('file', file);
  const response = await app.handle(
    new Request('http://localhost/api/assets/upload', {
      method: 'POST',
      headers: authHeaders(apiKey),
      body: formData,
    }),
  );
  const body = await response.json();
  return { status: response.status, body };
}

afterAll(async () => {
  await rm('.test-uploads', { recursive: true, force: true });
});

describe('assets upload validation', () => {
  test('accepts a valid small PNG', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    const { status, body } = await uploadRequest(app, plaintext, tinyPngFile());
    expect(status).toBe(200);
    expect(body.mimeType).toBe('image/png');
    expect(body.urlPath).toStartWith('/uploads/');
  });

  test('rejects a disallowed MIME type', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    const file = new File([new Uint8Array([1, 2, 3])], 'evil.exe', { type: 'application/x-msdownload' });
    const { status, body } = await uploadRequest(app, plaintext, file);
    expect(status).toBe(400);
    expect(body.error).toBe('invalid_file_type');
  });

  test('rejects a file over the configured size limit', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    const bigBytes = new Uint8Array(2000); // limit is 1024 in test env
    const file = new File([bigBytes], 'big.png', { type: 'image/png' });
    const { status, body } = await uploadRequest(app, plaintext, file);
    expect(status).toBe(400);
    expect(body.error).toBe('file_too_large');
  });

  test('uploaded asset is retrievable from the public /uploads route without auth', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    const uploaded = await uploadRequest(app, plaintext, tinyPngFile());

    const response = await app.handle(new Request(`http://localhost${uploaded.body.urlPath}`));
    expect(response.status).toBe(200);
  });

  test('delete removes the asset from the list', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    const uploaded = await uploadRequest(app, plaintext, tinyPngFile());

    const del = await app.handle(
      new Request(`http://localhost/api/assets/${uploaded.body.id}`, {
        method: 'DELETE',
        headers: authHeaders(plaintext),
      }),
    );
    expect(del.status).toBe(204);

    const list = await app.handle(
      new Request('http://localhost/api/assets', { headers: authHeaders(plaintext) }),
    );
    const listBody = await list.json();
    expect(listBody.assets.find((a: { id: string }) => a.id === uploaded.body.id)).toBeUndefined();
  });

  test('send_only key cannot upload assets', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'send_only' });
    const { status } = await uploadRequest(app, plaintext, tinyPngFile());
    expect(status).toBe(403);
  });
});
