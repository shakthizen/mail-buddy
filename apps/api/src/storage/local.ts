import { mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '../env';

const uploadsDir = env.UPLOADS_DIR;

async function ensureDir() {
  await mkdir(uploadsDir, { recursive: true });
}

export async function saveLocalFile(filename: string, data: Uint8Array): Promise<string> {
  await ensureDir();
  await Bun.write(join(uploadsDir, filename), data);
  return `/uploads/${filename}`;
}

export async function deleteLocalFile(filename: string): Promise<void> {
  await unlink(join(uploadsDir, filename)).catch(() => {});
}

export async function readLocalFile(filename: string) {
  const file = Bun.file(join(uploadsDir, filename));
  if (!(await file.exists())) return null;
  return file;
}
