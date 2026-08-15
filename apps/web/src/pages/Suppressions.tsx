import { useEffect, useState, type FormEvent } from 'react';
import type { Suppression } from 'mail-buddy-sdk';
import { useClient } from '../lib/auth';

export function Suppressions() {
  const client = useClient();
  const [suppressions, setSuppressions] = useState<Suppression[] | null>(null);
  const [email, setEmail] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function refresh() {
    try {
      const { suppressions } = await client.suppressions.list();
      setSuppressions(suppressions);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      await client.suppressions.add({ email, templateId: templateId || undefined });
      setEmail('');
      setTemplateId('');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(s: Suppression) {
    if (!confirm(`Resubscribe ${s.email}?`)) return;
    await client.suppressions.remove(s.email, { templateId: s.templateId ?? undefined });
    refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Suppression List</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Recipients on this list are automatically skipped during delivery (unsubscribes & bounces)
        </p>
      </div>

      {/* Add Suppression Form Card */}
      <form
        onSubmit={handleAdd}
        className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Add Manual Suppression
        </h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Email Address *
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs outline-none focus:border-violet-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Template ID (Optional, blank = Global)
            </label>
            <input
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              placeholder="Leave blank for global suppression"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs outline-none focus:border-violet-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !email}
            className="rounded-xl bg-violet-600 px-5 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {adding ? 'Adding…' : 'Suppress Email'}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
        {suppressions === null ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading suppressions…</div>
        ) : suppressions.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No suppressed recipients recorded.</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50 text-slate-500">
              <tr>
                <th className="px-5 py-3.5 font-medium">Email</th>
                <th className="px-5 py-3.5 font-medium">Scope / Template</th>
                <th className="px-5 py-3.5 font-medium">Reason</th>
                <th className="px-5 py-3.5 font-medium">Added</th>
                <th className="px-5 py-3.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {suppressions.map((s) => (
                <tr key={`${s.email}-${s.templateId ?? 'global'}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-3 font-mono text-[11px] font-medium text-slate-800 dark:text-slate-200">
                    {s.email}
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                    {s.templateId ? (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {s.templateId}
                      </span>
                    ) : (
                      <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        Global
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{s.reason ?? 'unsubscribed'}</td>
                  <td className="px-5 py-3 text-slate-400 text-[11px]">
                    {new Date(s.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(s)}
                      className="font-medium text-violet-600 hover:underline dark:text-violet-400"
                    >
                      Resubscribe
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
