import { useEffect, useRef, useState } from 'react';
import type { Asset } from 'mail-buddy-sdk';
import { useClient } from '../lib/auth';

export function Assets() {
  const client = useClient();
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const { assets } = await client.assets.list();
    setAssets(assets);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await client.assets.upload(file);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this asset?')) return;
    await client.assets.delete(id);
    refresh();
  }

  function copyUrl(urlPath: string) {
    navigator.clipboard.writeText(new URL(urlPath, window.location.origin).toString());
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Assets</h1>
        <label className="cursor-pointer rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700">
          {uploading ? 'Uploading…' : 'Upload image'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </label>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {assets && assets.length === 0 && <p className="text-sm text-neutral-500">No assets uploaded yet.</p>}

      {assets && assets.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"
            >
              <img src={asset.urlPath} alt={asset.originalName} className="h-32 w-full object-cover" />
              <div className="p-2">
                <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">{asset.originalName}</p>
                <div className="mt-2 flex justify-between text-xs">
                  <button onClick={() => copyUrl(asset.urlPath)} className="text-violet-600 hover:underline">
                    Copy URL
                  </button>
                  <button
                    onClick={() => handleDelete(asset.id)}
                    className="text-red-600 hover:underline dark:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
