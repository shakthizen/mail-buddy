import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { buildTestApp, jsonRequest, authHeaders, seedApiKey } from '../helpers';

const LOCALSTACK_ENDPOINT = 'http://127.0.0.1:4566';
const TEST_BUCKET = 'mail-buddy-integration-test-bucket';

// Configure S3 client for test setup/teardown against LocalStack
const s3TestClient = new S3Client({
  endpoint: LOCALSTACK_ENDPOINT,
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
});

let isLocalStackRunning = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${LOCALSTACK_ENDPOINT}/_localstack/health`);
    if (res.ok) {
      isLocalStackRunning = true;
    }
  } catch {
    isLocalStackRunning = false;
  }

  if (isLocalStackRunning) {
    // Configure environment for S3 storage
    process.env.STORAGE_PROVIDER = 's3';
    process.env.S3_BUCKET_NAME = TEST_BUCKET;
    process.env.S3_REGION = 'us-east-1';
    process.env.S3_ENDPOINT = LOCALSTACK_ENDPOINT;
    process.env.S3_ACCESS_KEY_ID = 'test';
    process.env.S3_SECRET_ACCESS_KEY = 'test';
    process.env.S3_FORCE_PATH_STYLE = 'true';

    // Create test bucket
    await s3TestClient
      .send(new CreateBucketCommand({ Bucket: TEST_BUCKET }))
      .catch(() => {});
  }
});

afterAll(async () => {
  if (isLocalStackRunning) {
    // Clean up objects and delete bucket
    try {
      const list = await s3TestClient.send(new ListObjectsV2Command({ Bucket: TEST_BUCKET }));
      if (list.Contents) {
        for (const item of list.Contents) {
          if (item.Key) {
            await s3TestClient.send(new DeleteObjectCommand({ Bucket: TEST_BUCKET, Key: item.Key }));
          }
        }
      }
      await s3TestClient.send(new DeleteBucketCommand({ Bucket: TEST_BUCKET }));
    } catch {}

    // Reset storage provider to local for other tests
    process.env.STORAGE_PROVIDER = 'local';
  }
});

describe('S3 Storage Engine with LocalStack', () => {
  test('saves, reads, and deletes file directly via S3 storage module', async () => {
    if (!isLocalStackRunning) {
      console.warn('LocalStack is not reachable at 4566 - skipping test');
      return;
    }

    const { saveS3File, readS3File, deleteS3File } = await import('../../src/storage/s3');

    const filename = `test-${Date.now()}.png`;
    const testData = new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]);

    // 1. Save
    const urlPath = await saveS3File(filename, testData, 'image/png');
    expect(urlPath).toBe(`/uploads/${filename}`);

    // Verify object exists in LocalStack
    const head = await s3TestClient.send(
      new HeadObjectCommand({ Bucket: TEST_BUCKET, Key: filename }),
    );
    expect(head.ContentType).toBe('image/png');

    // 2. Read
    const readResult = await readS3File(filename);
    expect(readResult).not.toBeNull();
    expect(readResult?.contentType).toBe('image/png');
    expect(Array.from(readResult!.data)).toEqual(Array.from(testData));

    // 3. Delete
    await deleteS3File(filename);
    const readAfterDelete = await readS3File(filename);
    expect(readAfterDelete).toBeNull();
  });

  test('uploads asset to S3 via API, retrieves via public route, and deletes asset', async () => {
    if (!isLocalStackRunning) {
      return;
    }

    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });

    const pngBytes = new Uint8Array([137, 80, 78, 71, 10, 20, 30, 40]);
    const file = new File([pngBytes], 'avatar.png', { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', file);

    // 1. Upload via POST /api/assets/upload
    const uploadRes = await app.handle(
      new Request('http://localhost/api/assets/upload', {
        method: 'POST',
        headers: authHeaders(plaintext),
        body: formData,
      }),
    );
    expect(uploadRes.status).toBe(200);
    const assetJson = (await uploadRes.json()) as any;
    expect(assetJson.id).toBeDefined();
    expect(assetJson.urlPath).toMatch(/^\/uploads\//);
    expect(assetJson.mimeType).toBe('image/png');

    // 2. Fetch via public unauthenticated route GET /uploads/:filename
    const publicRes = await app.handle(
      new Request(`http://localhost${assetJson.urlPath}`),
    );
    expect(publicRes.status).toBe(200);
    expect(publicRes.headers.get('content-type')).toBe('image/png');
    const retrievedBytes = new Uint8Array(await publicRes.arrayBuffer());
    expect(Array.from(retrievedBytes)).toEqual(Array.from(pngBytes));

    // 3. Delete asset via DELETE /api/assets/:id
    const deleteRes = await app.handle(
      new Request(`http://localhost/api/assets/${assetJson.id}`, {
        method: 'DELETE',
        headers: authHeaders(plaintext),
      }),
    );
    expect(deleteRes.status).toBe(204);

    // 4. Verify public route now returns 404
    const notFoundRes = await app.handle(
      new Request(`http://localhost${assetJson.urlPath}`),
    );
    expect(notFoundRes.status).toBe(404);
  });
});
