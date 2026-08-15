import { useEffect, useRef, useState } from 'react';
import type { Asset } from 'mail-buddy-sdk';
import { useClient } from '../lib/auth';

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function Assets() {
  const client = useClient();
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const { assets } = await client.assets.list();
      setAssets(assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpload(files: FileList | File[] | null) {
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

  async function handleDelete(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to delete this asset?')) return;
    try {
      await client.assets.delete(id);
      if (selectedAsset?.id === id) {
        setSelectedAsset(null);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function getFullUrl(urlPath: string) {
    return urlPath.startsWith('http')
      ? urlPath
      : new URL(urlPath, window.location.origin).toString();
  }

  function copyText(text: string, key: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  const filteredAssets = (assets ?? []).filter((asset) => {
    const q = search.toLowerCase();
    return (
      asset.originalName.toLowerCase().includes(q) ||
      asset.filename.toLowerCase().includes(q) ||
      asset.mimeType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Asset Library</h1>
          <p className="text-sm text-neutral-500">
            Upload and manage images and static files for email templates
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-50">
            {uploading ? 'Uploading…' : 'Upload Images'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              multiple
              disabled={uploading}
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Drag and Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleUpload(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${
          isDragging
            ? 'border-violet-500 bg-violet-50/50 dark:border-violet-400 dark:bg-violet-950/20'
            : 'border-neutral-200 bg-neutral-50/50 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/40'
        }`}
      >
        <svg
          className="mb-2 h-8 w-8 text-neutral-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Drag & drop images here, or{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-violet-600 hover:underline dark:text-violet-400"
          >
            browse
          </button>
        </p>
        <p className="text-xs text-neutral-400">Supports PNG, JPEG, GIF, and WEBP</p>
      </div>

      {/* Toolbar: Search and View Mode */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2 text-xs text-neutral-400 hover:text-neutral-600"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">
            {filteredAssets.length} {filteredAssets.length === 1 ? 'asset' : 'assets'}
          </span>
          <div className="flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded px-2.5 py-1 text-xs font-medium ${
                viewMode === 'grid'
                  ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-white'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded px-2.5 py-1 text-xs font-medium ${
                viewMode === 'list'
                  ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-white'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Asset Content */}
      {assets === null ? (
        <div className="py-12 text-center text-sm text-neutral-500">Loading assets…</div>
      ) : filteredAssets.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 py-12 text-center text-neutral-500 dark:border-neutral-800">
          {search ? 'No assets matching your search query.' : 'No assets uploaded yet.'}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => setSelectedAsset(asset)}
              className="group cursor-pointer overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-violet-400 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="relative aspect-square w-full bg-neutral-100 dark:bg-neutral-800">
                <img
                  src={asset.urlPath}
                  alt={asset.originalName}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center gap-2">
                  <span className="rounded bg-white/90 px-2 py-1 text-xs font-medium text-neutral-900 shadow">
                    View Details
                  </span>
                </div>
              </div>
              <div className="p-3">
                <p className="truncate text-xs font-medium text-neutral-800 dark:text-neutral-200">
                  {asset.originalName}
                </p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  {formatBytes(asset.fileSize)}
                </p>
                <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 text-xs dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={(e) => copyText(getFullUrl(asset.urlPath), `url-${asset.id}`, e)}
                    className="text-violet-600 hover:underline dark:text-violet-400"
                  >
                    {copiedKey === `url-${asset.id}` ? 'Copied!' : 'Copy URL'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(asset.id, e)}
                    className="text-red-500 hover:underline dark:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/50 text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Preview</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredAssets.map((asset) => (
                <tr
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                >
                  <td className="px-4 py-2">
                    <img
                      src={asset.urlPath}
                      alt={asset.originalName}
                      className="h-10 w-10 rounded-md object-cover"
                    />
                  </td>
                  <td className="px-4 py-2 font-medium text-neutral-800 dark:text-neutral-200">
                    {asset.originalName}
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{formatBytes(asset.fileSize)}</td>
                  <td className="px-4 py-2 text-neutral-500">{asset.mimeType}</td>
                  <td className="px-4 py-2 text-neutral-500">{asset.createdAt}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={(e) => copyText(getFullUrl(asset.urlPath), `url-${asset.id}`, e)}
                        className="text-violet-600 hover:underline dark:text-violet-400"
                      >
                        {copiedKey === `url-${asset.id}` ? 'Copied!' : 'Copy URL'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(asset.id, e)}
                        className="text-red-500 hover:underline dark:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Asset Details & Lightbox Modal */}
      {selectedAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelectedAsset(null)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                {selectedAsset.originalName}
              </h3>
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="flex max-h-72 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
                <img
                  src={selectedAsset.urlPath}
                  alt={selectedAsset.originalName}
                  className="max-h-72 w-auto object-contain"
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-800">
                  <span className="text-neutral-400">File Size</span>
                  <p className="font-medium text-neutral-800 dark:text-neutral-200">
                    {formatBytes(selectedAsset.fileSize)}
                  </p>
                </div>
                <div className="rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-800">
                  <span className="text-neutral-400">Format</span>
                  <p className="font-medium text-neutral-800 dark:text-neutral-200">
                    {selectedAsset.mimeType}
                  </p>
                </div>
                <div className="rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-800">
                  <span className="text-neutral-400">Uploaded</span>
                  <p className="font-medium text-neutral-800 dark:text-neutral-200">
                    {selectedAsset.createdAt}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    Public Image URL
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      readOnly
                      value={getFullUrl(selectedAsset.urlPath)}
                      className="flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-1.5 font-mono text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        copyText(getFullUrl(selectedAsset.urlPath), 'modal-url')
                      }
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
                    >
                      {copiedKey === 'modal-url' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    HTML Tag Snippet
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      readOnly
                      value={`<img src="${getFullUrl(selectedAsset.urlPath)}" alt="${selectedAsset.originalName}" style="max-width: 100%; height: auto;" />`}
                      className="flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-1.5 font-mono text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          `<img src="${getFullUrl(selectedAsset.urlPath)}" alt="${selectedAsset.originalName}" style="max-width: 100%; height: auto;" />`,
                          'modal-html',
                        )
                      }
                      className="rounded-lg bg-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
                    >
                      {copiedKey === 'modal-html' ? 'Copied!' : 'Copy Tag'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between border-t border-neutral-200 bg-neutral-50 px-6 py-3 dark:border-neutral-800 dark:bg-neutral-800/40">
              <button
                type="button"
                onClick={() => handleDelete(selectedAsset.id)}
                className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
              >
                Delete Asset
              </button>
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="rounded-lg bg-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

