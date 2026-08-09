import { saveLocalFile, deleteLocalFile } from './local';
import { env } from '../env';

const provider = env.STORAGE_PROVIDER;

/** S3 support is documented in project-plan.md section 1.5 but not yet implemented -
 * follow-up work. Local storage is fully implemented and is the default driver. */
export async function saveFile(filename: string, data: Uint8Array): Promise<string> {
  if (provider === 's3') {
    throw new Error('STORAGE_PROVIDER=s3 is not implemented yet - use the local driver for now');
  }
  return saveLocalFile(filename, data);
}

export async function deleteFile(filename: string): Promise<void> {
  if (provider === 's3') {
    throw new Error('STORAGE_PROVIDER=s3 is not implemented yet - use the local driver for now');
  }
  return deleteLocalFile(filename);
}
