import { saveLocalFile, deleteLocalFile, readLocalFile } from './local';
import { saveS3File, deleteS3File, readS3File } from './s3';
import { getStorageConfig } from '../lib/appSettings';

export async function saveFile(
  filename: string,
  data: Uint8Array,
  mimeType?: string,
): Promise<string> {
  const { provider } = getStorageConfig();
  if (provider === 's3') {
    return saveS3File(filename, data, mimeType);
  }
  return saveLocalFile(filename, data);
}

export async function deleteFile(filename: string): Promise<void> {
  const { provider } = getStorageConfig();
  if (provider === 's3') {
    return deleteS3File(filename);
  }
  return deleteLocalFile(filename);
}

export async function readFile(filename: string) {
  const { provider } = getStorageConfig();
  if (provider === 's3') {
    return readS3File(filename);
  }
  return readLocalFile(filename);
}

