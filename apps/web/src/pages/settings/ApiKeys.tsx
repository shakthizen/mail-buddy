import { useEffect, useState, type FormEvent } from 'react';
import type { ApiKeyScope, ApiKeySummary } from 'mail-buddy-sdk';
import { useClient } from '../../lib/auth';

export function ApiKeys() {
  const client = useClient();
  const [keys, setKeys] = useState<ApiKeySummary[] | null>(null);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<ApiKeyScope>('send_only');
  const [allowedOrigins, setAllowedOrigins] = useState('');
  const [allowedIps, setAllowedIps] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { apiKeys } = await client.apiKeys.list();
    setKeys(apiKeys);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function splitList(value: string): string[] | undefined {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return list.length ? list : undefined;
  }

  function copyToClipboard(text: string, identifier: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(identifier);
    setTimeout(() => setCopiedKey(null), 2500);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = await client.apiKeys.create({
        name,
        scope,
        allowedOrigins: splitList(allowedOrigins),
        allowedIps: splitList(allowedIps),
      });
      setNewKey(created.key);
      setName('');
      setAllowedOrigins('');
      setAllowedIps('');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this API key? Any integration using it will stop working immediately.')) return;
    await client.apiKeys.revoke(id);
    refresh();
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-neutral-900 dark:text-white">API Keys</h1>

      {newKey && (
        <div className="mb-6 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm dark:border-yellow-700/60 dark:bg-yellow-950/40">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-yellow-900 dark:text-yellow-200">
              🔑 Copy your new API key now — it will never be displayed again:
            </p>
            <button
              type="button"
              onClick={() => copyToClipboard(newKey, 'new-key')}
              className="flex items-center gap-1.5 rounded-lg bg-yellow-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-yellow-700 dark:bg-yellow-600"
            >
              {copiedKey === 'new-key' ? '✓ Copied!' : 'Copy API Key'}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-white p-2.5 dark:bg-neutral-900 border border-yellow-200 dark:border-yellow-800">
            <code className="font-mono text-xs text-neutral-800 dark:text-neutral-200 break-all select-all">
              {newKey}
            </code>
          </div>
        </div>
      )}

      <form onSubmit={handleCreate} className="mb-8 grid grid-cols-2 gap-4 rounded-xl border border-neutral-200 p-5 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Production Webhook / Backend Worker"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Scope</label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as ApiKeyScope)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          >
            <option value="send_only">send_only (Can only trigger email sends)</option>
            <option value="admin">admin (Full administrative access)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Allowed origins (comma-separated, blank = open)
          </label>
          <input
            value={allowedOrigins}
            onChange={(e) => setAllowedOrigins(e.target.value)}
            placeholder="https://app.example.com, https://admin.example.com"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Allowed IPs / CIDRs (comma-separated, blank = open)
          </label>
          <input
            value={allowedIps}
            onChange={(e) => setAllowedIps(e.target.value)}
            placeholder="203.0.113.0/24, 198.51.100.4"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
        <div className="col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
          >
            Create API Key
          </button>
        </div>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {keys && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Key Prefix</th>
                <th className="px-4 py-3 font-medium">Scope</th>
                <th className="px-4 py-3 font-medium">Restrictions</th>
                <th className="px-4 py-3 font-medium">Last used</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {keys.map((k) => (
                <tr key={k.id} className={k.revoked ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium text-neutral-800 dark:text-neutral-200">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                    <div className="flex items-center gap-1.5">
                      <span>{k.keyPrefix}…</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(k.keyPrefix, `prefix-${k.id}`)}
                        className="text-[10px] text-violet-600 hover:underline dark:text-violet-400"
                      >
                        {copiedKey === `prefix-${k.id}` ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                        k.scope === 'admin'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {k.scope}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {k.allowedOrigins.length === 0 && k.allowedIps.length === 0
                      ? 'Open'
                      : [...k.allowedOrigins, ...k.allowedIps].join(', ')}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!k.revoked && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(k.id)}
                        className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                      >
                        Revoke
                      </button>
                    )}
                    {k.revoked && (
                      <span className="text-xs text-neutral-400">Revoked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

