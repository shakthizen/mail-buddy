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
        <div className="mb-6 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm dark:border-yellow-700 dark:bg-yellow-950">
          <p className="mb-2 font-medium text-yellow-900 dark:text-yellow-200">
            Copy this key now - it will never be shown again:
          </p>
          <code className="block break-all rounded bg-white p-2 text-xs dark:bg-neutral-900">{newKey}</code>
        </div>
      )}

      <form onSubmit={handleCreate} className="mb-8 grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Scope</label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as ApiKeyScope)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          >
            <option value="send_only">send_only</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Allowed origins (comma-separated, blank = open)
          </label>
          <input
            value={allowedOrigins}
            onChange={(e) => setAllowedOrigins(e.target.value)}
            placeholder="https://app.example.com"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Allowed IPs / CIDRs (comma-separated, blank = open)
          </label>
          <input
            value={allowedIps}
            onChange={(e) => setAllowedIps(e.target.value)}
            placeholder="203.0.113.0/24"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
        <div className="col-span-2">
          <button
            type="submit"
            className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Create key
          </button>
        </div>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {keys && (
        <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Key</th>
                <th className="px-4 py-2 font-medium">Scope</th>
                <th className="px-4 py-2 font-medium">Restrictions</th>
                <th className="px-4 py-2 font-medium">Last used</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {keys.map((k) => (
                <tr key={k.id} className={k.revoked ? 'opacity-50' : ''}>
                  <td className="px-4 py-2">{k.name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{k.keyPrefix}…</td>
                  <td className="px-4 py-2">{k.scope}</td>
                  <td className="px-4 py-2 text-neutral-500">
                    {k.allowedOrigins.length === 0 && k.allowedIps.length === 0
                      ? 'Open'
                      : [...k.allowedOrigins, ...k.allowedIps].join(', ')}
                  </td>
                  <td className="px-4 py-2 text-neutral-500">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {!k.revoked && (
                      <button
                        onClick={() => handleRevoke(k.id)}
                        className="text-red-600 hover:underline dark:text-red-400"
                      >
                        Revoke
                      </button>
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
