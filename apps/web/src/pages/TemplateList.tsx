import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Template } from 'mail-buddy-sdk';
import { useClient } from '../lib/auth';
import { TemplateUsageModal } from '../components/TemplateUsageModal';

export function TemplateList() {
  const client = useClient();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Usage modal state
  const [usageTemplate, setUsageTemplate] = useState<Template | null>(null);

  async function refresh() {
    try {
      const { templates } = await client.templates.list();
      setTemplates(templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return;
    await client.templates.delete(id);
    refresh();
  }

  const filtered = (templates ?? []).filter((t) => {
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Email Templates</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create, edit, and organize Handlebars email templates and partial components
          </p>
        </div>
        <Link
          to="/templates/new"
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-violet-500/20 hover:bg-violet-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Template</span>
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <input
          type="text"
          placeholder="Filter templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2 text-xs outline-none focus:border-violet-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-white"
        />
      </div>

      {/* Templates Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
        {templates === null ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading templates…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {search ? 'No templates matching your filter.' : 'No templates yet — click "New Template" to create one.'}
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50 text-slate-500">
              <tr>
                <th className="px-5 py-3.5 font-medium">Template Name</th>
                <th className="px-5 py-3.5 font-medium">Placeholders</th>
                <th className="px-5 py-3.5 font-medium">Last Modified</th>
                <th className="px-5 py-3.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-3.5">
                    <Link
                      to={`/templates/${t.id}`}
                      className="font-semibold text-slate-900 hover:text-violet-600 dark:text-white dark:hover:text-violet-400"
                    >
                      {t.name}
                    </Link>
                    {t.description && (
                      <p className="mt-0.5 text-[11px] text-slate-400 truncate max-w-md">{t.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {t.placeholders.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {t.placeholders.map((p) => (
                          <span
                            key={p}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[11px] text-slate-400">
                    {new Date(t.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setUsageTemplate(t)}
                        className="flex items-center gap-1 font-semibold text-violet-600 hover:underline dark:text-violet-400"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                          />
                        </svg>
                        <span>API Code</span>
                      </button>
                      <Link
                        to={`/templates/${t.id}`}
                        className="font-medium text-slate-600 hover:underline dark:text-slate-300"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id, t.name)}
                        className="font-medium text-red-600 hover:underline dark:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Code Examples Modal */}
      {usageTemplate && (
        <TemplateUsageModal
          template={usageTemplate}
          isOpen={!!usageTemplate}
          onClose={() => setUsageTemplate(null)}
        />
      )}
    </div>
  );
}
