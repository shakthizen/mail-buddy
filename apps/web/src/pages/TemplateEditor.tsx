import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useClient } from '../lib/auth';

const DEFAULT_HTML = '<p>Hi {{username}}</p>\n<p><a href="{{{unsubscribe_link}}}">unsubscribe</a></p>';

export function TemplateEditor() {
  const client = useClient();
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = !id || id === 'new';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [htmlContent, setHtmlContent] = useState(DEFAULT_HTML);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew || !id) return;
    client.templates.get(id).then((t) => {
      setName(t.name);
      setDescription(t.description ?? '');
      setHtmlContent(t.htmlContent);
      setPlaceholders(t.placeholders);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const created = await client.templates.create({ name, description, htmlContent });
        navigate(`/templates/${created.id}`, { replace: true });
      } else if (id) {
        const updated = await client.templates.update(id, { name, description, htmlContent });
        setPlaceholders(updated.placeholders);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
          {isNew ? 'New Template' : 'Edit Template'}
        </h1>
        <button
          onClick={handleSave}
          disabled={saving || !name || !htmlContent}
          className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Description
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
      </div>

      {placeholders.length > 0 && (
        <p className="mb-4 text-sm text-neutral-500">
          Detected placeholders: <span className="font-mono">{placeholders.join(', ')}</span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-4" style={{ height: '60vh' }}>
        <div className="flex flex-col">
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            HTML (Handlebars) - use {'{{var}}'} for placeholders, {'{{embed "uuid"}}'} to nest another
            template
          </label>
          <textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            className="flex-1 resize-none rounded-md border border-neutral-300 p-3 font-mono text-xs outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col">
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Raw preview (variables not substituted)
          </label>
          <iframe
            title="preview"
            srcDoc={htmlContent}
            className="flex-1 rounded-md border border-neutral-300 bg-white dark:border-neutral-700"
          />
        </div>
      </div>
    </div>
  );
}
