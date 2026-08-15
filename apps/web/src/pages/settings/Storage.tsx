import { useEffect, useState } from 'react';
import { useClient } from '../../lib/auth';

export function Storage() {
  const client = useClient();

  // Storage Settings
  const [provider, setProvider] = useState<'local' | 's3'>('local');
  const [s3BucketName, setS3BucketName] = useState('');
  const [s3Region, setS3Region] = useState('us-east-1');
  const [s3Endpoint, setS3Endpoint] = useState('');
  const [s3AccessKeyId, setS3AccessKeyId] = useState('');
  const [s3SecretAccessKey, setS3SecretAccessKey] = useState('');
  const [s3ForcePathStyle, setS3ForcePathStyle] = useState(false);
  const [s3PublicUrl, setS3PublicUrl] = useState('');

  // General Settings
  const [publicUrl, setPublicUrl] = useState('');

  // State indicators
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Test Storage State
  const [testingStorage, setTestingStorage] = useState(false);
  const [testStorageResult, setTestStorageResult] = useState<{ ok: boolean; message?: string } | null>(null);

  useEffect(() => {
    client.settings.get().then((s) => {
      setProvider(s.storage.provider);
      setS3BucketName(s.storage.s3BucketName ?? '');
      setS3Region(s.storage.s3Region ?? 'us-east-1');
      setS3Endpoint(s.storage.s3Endpoint ?? '');
      setS3AccessKeyId(s.storage.s3AccessKeyId ?? '');
      setS3SecretAccessKey(s.storage.s3SecretAccessKey ?? '');
      setS3ForcePathStyle(s.storage.s3ForcePathStyle ?? false);
      setS3PublicUrl(s.storage.s3PublicUrl ?? '');

      setPublicUrl(s.general?.publicUrl ?? '');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await client.settings.update({
        storage: {
          provider,
          s3BucketName,
          s3Region,
          s3Endpoint,
          s3AccessKeyId,
          s3SecretAccessKey,
          s3ForcePathStyle,
          s3PublicUrl,
        },
        general: {
          publicUrl,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleTestStorage() {
    setTestingStorage(true);
    setTestStorageResult(null);
    try {
      const res = await client.settings.testStorage();
      setTestStorageResult(res);
    } catch (err: any) {
      setTestStorageResult({
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTestingStorage(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-xs outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-800 dark:bg-slate-800/90 dark:text-white';
  const labelClass = 'mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300';

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Storage Engine Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure local filesystem or S3-compatible cloud storage for template assets
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-xs font-semibold text-white shadow-sm shadow-violet-500/20 hover:bg-violet-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Storage Settings'}
        </button>
      </div>

      {saved && (
        <div className="rounded-xl border border-green-200 bg-green-50/80 p-3.5 text-xs text-green-700 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300">
          ✓ Storage settings saved successfully to database!
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Storage Provider Selector Card */}
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Storage Backend
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select the active storage driver for image and asset uploads
            </p>
          </div>
          <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700 dark:bg-violet-950 dark:text-violet-300">
            {provider === 's3' ? 'S3 Storage' : 'Local Filesystem'}
          </span>
        </div>

        {/* Provider Switcher Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div
            onClick={() => setProvider('local')}
            className={`cursor-pointer rounded-2xl border p-4 transition ${
              provider === 'local'
                ? 'border-violet-500 bg-violet-50/60 dark:border-violet-500 dark:bg-violet-950/30'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white">
              <input
                type="radio"
                name="storage_provider"
                checked={provider === 'local'}
                onChange={() => setProvider('local')}
                className="text-violet-600 focus:ring-violet-500"
              />
              Local Filesystem
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Stores images directly in the local <code className="font-mono text-[10px]">./uploads</code> directory. Ideal for single-instance deployments.
            </p>
          </div>

          <div
            onClick={() => setProvider('s3')}
            className={`cursor-pointer rounded-2xl border p-4 transition ${
              provider === 's3'
                ? 'border-violet-500 bg-violet-50/60 dark:border-violet-500 dark:bg-violet-950/30'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white">
              <input
                type="radio"
                name="storage_provider"
                checked={provider === 's3'}
                onChange={() => setProvider('s3')}
                className="text-violet-600 focus:ring-violet-500"
              />
              Amazon S3 / S3-Compatible
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Compatible with AWS S3, LocalStack, MinIO, Cloudflare R2, and DigitalOcean Spaces.
            </p>
          </div>
        </div>

        {/* S3 Details Form */}
        {provider === 's3' && (
          <div className="mt-6 space-y-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              S3 Bucket & Credentials
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Bucket Name *</label>
                <input
                  required
                  value={s3BucketName}
                  onChange={(e) => setS3BucketName(e.target.value)}
                  placeholder="my-mail-buddy-assets"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Region</label>
                <input
                  value={s3Region}
                  onChange={(e) => setS3Region(e.target.value)}
                  placeholder="us-east-1"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Custom Endpoint URL (Optional)</label>
                <input
                  value={s3Endpoint}
                  onChange={(e) => setS3Endpoint(e.target.value)}
                  placeholder="http://localhost:4566 or https://<id>.r2.cloudflarestorage.com"
                  className={inputClass}
                />
                <span className="text-[10px] text-slate-400">
                  Required for LocalStack, MinIO, or Cloudflare R2.
                </span>
              </div>
              <div>
                <label className={labelClass}>Public Asset Base URL (Optional)</label>
                <input
                  value={s3PublicUrl}
                  onChange={(e) => setS3PublicUrl(e.target.value)}
                  placeholder="https://cdn.example.com/assets"
                  className={inputClass}
                />
                <span className="text-[10px] text-slate-400">
                  Leave blank to proxy through Mail Buddy's <code className="font-mono">/uploads</code> endpoint.
                </span>
              </div>
              <div>
                <label className={labelClass}>Access Key ID</label>
                <input
                  value={s3AccessKeyId}
                  onChange={(e) => setS3AccessKeyId(e.target.value)}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Secret Access Key</label>
                <input
                  type="password"
                  value={s3SecretAccessKey}
                  onChange={(e) => setS3SecretAccessKey(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={s3ForcePathStyle}
                    onChange={(e) => setS3ForcePathStyle(e.target.checked)}
                    className="rounded text-violet-600 focus:ring-violet-500"
                  />
                  Force Path Style (Required for LocalStack and MinIO, e.g. <code className="font-mono text-[10px]">http://endpoint/bucket/key</code>)
                </label>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestStorage}
                disabled={testingStorage}
                className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {testingStorage ? 'Verifying S3 Connection…' : 'Test S3 Bucket Access'}
              </button>
            </div>

            {testStorageResult && (
              <div
                className={`mt-2 rounded-xl p-3 text-xs ${
                  testStorageResult.ok
                    ? 'border border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/60 dark:text-green-300'
                    : 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/60 dark:text-red-300'
                }`}
              >
                <p className="font-semibold">{testStorageResult.ok ? '✓ S3 Bucket Connection Verified!' : '✕ S3 Test Failed'}</p>
                <p className="mt-0.5 font-mono text-[11px]">{testStorageResult.message}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* General Settings Card */}
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          General Application URLs
        </h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Root public endpoints used for email links and asset referencing
        </p>

        <div>
          <label className={labelClass}>Public Server URL</label>
          <input
            value={publicUrl}
            onChange={(e) => setPublicUrl(e.target.value)}
            placeholder="http://localhost:3000 or https://mail.example.com"
            className={inputClass}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Used as the root domain for one-click unsubscribe links and public image URLs.
          </p>
        </div>
      </div>
    </div>
  );
}
