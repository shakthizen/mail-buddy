import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  NoSuchKey,
} from '@aws-sdk/client-s3';
import { getStorageConfig } from '../lib/appSettings';

export function getS3Config() {
  const storage = getStorageConfig();
  return {
    region: storage.s3Region || 'us-east-1',
    endpoint: storage.s3Endpoint || undefined,
    bucket: storage.s3BucketName,
    accessKeyId: storage.s3AccessKeyId,
    secretAccessKey: storage.s3SecretAccessKey,
    forcePathStyle: storage.s3ForcePathStyle,
    publicUrl: storage.s3PublicUrl,
  };
}

export async function verifyS3Connection(): Promise<{ ok: boolean; message?: string }> {
  const config = getS3Config();
  if (!config.bucket) {
    return { ok: false, message: 'S3 bucket name is not configured.' };
  }
  const client = getS3Client();
  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    return { ok: true };
  } catch (err: any) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export function getS3Client(): S3Client {
  const config = getS3Config();
  const s3Config: ConstructorParameters<typeof S3Client>[0] = {
    region: config.region,
  };

  if (config.endpoint) {
    s3Config.endpoint = config.endpoint;
  }
  if (config.forcePathStyle) {
    s3Config.forcePathStyle = true;
  }
  if (config.accessKeyId && config.secretAccessKey) {
    s3Config.credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    };
  } else if (config.endpoint) {
    // For local test emulators like LocalStack without explicit credentials
    s3Config.credentials = {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    };
  }

  return new S3Client(s3Config);
}

export async function saveS3File(
  filename: string,
  data: Uint8Array,
  mimeType?: string,
): Promise<string> {
  const config = getS3Config();
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: filename,
      Body: data,
      ContentType: mimeType ?? 'application/octet-stream',
    }),
  );

  if (config.publicUrl) {
    const base = config.publicUrl.replace(/\/$/, '');
    return `${base}/${filename}`;
  }

  return `/uploads/${filename}`;
}

export async function deleteS3File(filename: string): Promise<void> {
  const config = getS3Config();
  const client = getS3Client();
  await client
    .send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: filename,
      }),
    )
    .catch(() => {});
}

export async function readS3File(
  filename: string,
): Promise<{ data: Uint8Array; contentType: string } | null> {
  const config = getS3Config();
  const client = getS3Client();
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: filename,
      }),
    );

    if (!response.Body) return null;
    const data = await response.Body.transformToByteArray();
    return {
      data,
      contentType: response.ContentType || 'application/octet-stream',
    };
  } catch (err: any) {
    if (err instanceof NoSuchKey || err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}
