import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Template } from 'mail-buddy-sdk';
import { useClient } from '../lib/auth';

export function TemplateList() {
  const client = useClient();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function handleDelete(id: string) {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    await client.templates.delete(id);
    refresh();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Templates</h1>
        <Link
          to="/templates/new"
          className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          New Template
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {templates && templates.length === 0 && (
        <p className="text-sm text-neutral-500">No templates yet - create your first one.</p>
      )}

      {templates && templates.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Placeholders</th>
                <th className="px-4 py-2 font-medium">Updated</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {templates.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2">
                    <Link to={`/templates/${t.id}`} className="font-medium text-violet-600 hover:underline">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{t.placeholders.join(', ') || '—'}</td>
                  <td className="px-4 py-2 text-neutral-500">{new Date(t.updatedAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-sm text-red-600 hover:underline dark:text-red-400"
                    >
                      Delete
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
