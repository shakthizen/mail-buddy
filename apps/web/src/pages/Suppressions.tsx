import { useEffect, useState, type FormEvent } from 'react';
import type { Suppression } from 'mail-buddy-sdk';
import { useClient } from '../lib/auth';

export function Suppressions() {
  const client = useClient();
  const [suppressions, setSuppressions] = useState<Suppression[] | null>(null);
  const [email, setEmail] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { suppressions } = await client.suppressions.list();
    setSuppressions(suppressions);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await client.suppressions.add({ email, templateId: templateId || undefined });
      setEmail('');
      setTemplateId('');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleRemove(s: Suppression) {
    await client.suppressions.remove(s.email, { templateId: s.templateId ?? undefined });
    refresh();
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-neutral-900 dark:text-white">Suppression List</h1>

      <form onSubmit={handleAdd} className="mb-6 flex items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Template ID (optional - blank = all templates)
          </label>
          <input
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            placeholder="all templates"
            className="w-64 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          Add
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {suppressions && suppressions.length === 0 && (
        <p className="text-sm text-neutral-500">No suppressed emails.</p>
      )}

      {suppressions && suppressions.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Template</th>
                <th className="px-4 py-2 font-medium">Reason</th>
                <th className="px-4 py-2 font-medium">Added</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {suppressions.map((s) => (
                <tr key={`${s.email}-${s.templateId ?? 'global'}`}>
                  <td className="px-4 py-2">{s.email}</td>
                  <td className="px-4 py-2 text-neutral-500">{s.templateId ?? 'All templates'}</td>
                  <td className="px-4 py-2 text-neutral-500">{s.reason ?? '—'}</td>
                  <td className="px-4 py-2 text-neutral-500">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleRemove(s)} className="text-violet-600 hover:underline">
                      Resubscribe
                    </button>
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
