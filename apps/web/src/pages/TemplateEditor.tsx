import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Asset, Template } from 'mail-buddy-sdk';
import { useClient } from '../lib/auth';
import { TemplateUsageModal } from '../components/TemplateUsageModal';

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; color: #1e293b; line-height: 1.5; padding: 20px; }
    .card { max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; }
    .btn { display: inline-block; background: #7c3aed; color: #ffffff !important; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 12px; }
    .footer { font-size: 11px; color: #94a3b8; margin-top: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Hello, {{username}}!</h2>
    <p>Thank you for your order with <strong>{{company_name}}</strong>. Your confirmation code is <code>{{order_id}}</code>.</p>
    <a href="{{action_url}}" class="btn">View Order Details</a>
    <div class="footer">
      <p>Need help? Reply directly to this email or <a href="{{{unsubscribe_link}}}">unsubscribe</a>.</p>
    </div>
  </div>
</body>
</html>`;

export function TemplateEditor() {
  const client = useClient();
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = !id || id === 'new';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [htmlContent, setHtmlContent] = useState(DEFAULT_HTML);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [embeds, setEmbeds] = useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live compilation state
  const [compiledHtml, setCompiledHtml] = useState<string>('');
  const [compiling, setCompiling] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [sampleVariables, setSampleVariables] = useState<Record<string, string>>({});

  // Preview tab & mode state
  const [activeTab, setActiveTab] = useState<'preview' | 'html' | 'variables'>('preview');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedHtml, setCopiedHtml] = useState(false);

  // Asset picker state
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Embed template picker state
  const [showEmbedPicker, setShowEmbedPicker] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<Template[]>([]);

  // Usage modal state
  const [showUsageModal, setShowUsageModal] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial load
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

  // Debounced live compilation
  const sampleVarsStr = JSON.stringify(sampleVariables);

  useEffect(() => {
    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
    }

    setCompiling(true);
    previewDebounceRef.current = setTimeout(async () => {
      try {
        const res = await client.templates.preview({
          htmlContent,
          variables: sampleVariables,
        });
        setCompiledHtml(res.renderedHtml);
        setPlaceholders(res.placeholders);
        setEmbeds(res.embeds);
        setCompileError(null);

        // Only update sampleVariables if new placeholders were discovered
        setSampleVariables((prev) => {
          let hasNewKey = false;
          const next = { ...prev };
          for (const [k, v] of Object.entries(res.variablesUsed)) {
            if (next[k] === undefined) {
              next[k] = v;
              hasNewKey = true;
            }
          }
          return hasNewKey ? next : prev;
        });
      } catch (err: any) {
        setCompileError(err instanceof Error ? err.message : String(err));
      } finally {
        setCompiling(false);
      }
    }, 300);

    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [htmlContent, sampleVarsStr]);

  async function openAssetPicker() {
    setShowAssetPicker(true);
    setLoadingAssets(true);
    try {
      const res = await client.assets.list();
      setAssets(res.assets);
    } catch {
      // ignore
    } finally {
      setLoadingAssets(false);
    }
  }

  async function openEmbedPicker() {
    setShowEmbedPicker(true);
    try {
      const res = await client.templates.list();
      setAvailableTemplates(res.templates.filter((t) => t.id !== id));
    } catch {
      // ignore
    }
  }

  function insertAtCursor(textToInsert: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setHtmlContent((prev) => prev + textToInsert);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = htmlContent.substring(0, start);
    const after = htmlContent.substring(end);
    const newContent = before + textToInsert + after;
    setHtmlContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 50);
  }

  function handleInsertAsset(asset: Asset, mode: 'img' | 'url') {
    const fullUrl = asset.urlPath.startsWith('http')
      ? asset.urlPath
      : new URL(asset.urlPath, window.location.origin).toString();

    if (mode === 'img') {
      insertAtCursor(`<img src="${fullUrl}" alt="${asset.originalName}" style="max-width: 100%; height: auto;" />`);
    } else {
      insertAtCursor(fullUrl);
    }
    setShowAssetPicker(false);
  }

  function handleInsertEmbed(templateId: string) {
    insertAtCursor(`{{embed "${templateId}"}}`);
    setShowEmbedPicker(false);
  }

  function handleCopyCompiledHtml() {
    navigator.clipboard.writeText(compiledHtml);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  }

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

  const filteredAssets = assets.filter((a) =>
    a.originalName.toLowerCase().includes(assetSearch.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {isNew ? 'Create New Template' : `Edit Template: ${name || 'Untitled'}`}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Design Handlebars HTML templates with live recursive embed compilation and sample variables
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              type="button"
              onClick={() => setShowUsageModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <svg className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span>API Code Examples</span>
            </button>
          )}
          <button
            type="button"
            onClick={openAssetPicker}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Insert Asset</span>
          </button>
          <button
            type="button"
            onClick={openEmbedPicker}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            <span>Embed Template</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name || !htmlContent}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-5 py-2 text-xs font-semibold text-white shadow-sm shadow-violet-500/20 hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Meta details */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Template Name *
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Order Confirmation"
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2 text-xs outline-none focus:border-violet-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Description (Optional)
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Transactional receipt sent immediately after checkout"
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2 text-xs outline-none focus:border-violet-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-white"
          />
        </div>
      </div>

      {/* Variables & Embeds Status Bar */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-3.5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60 shadow-sm">
        {/* Inbuilt Variables (Clickable Tags) */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
            Inbuilt Variables (Click to insert):
          </span>
          <button
            type="button"
            title="Click to insert {{{unsubscribe_link}}} — Auto-generated HMAC signed unsubscribe URL"
            onClick={() => insertAtCursor('{{{unsubscribe_link}}}')}
            className="group flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 shadow-sm transition hover:border-violet-400 hover:bg-violet-100 dark:border-violet-800/60 dark:bg-violet-950/50 dark:text-violet-300 dark:hover:bg-violet-900/60"
          >
            <span className="text-violet-500 dark:text-violet-400">+</span>
            <code className="font-mono text-[11px] font-bold">{'{{{unsubscribe_link}}}'}</code>
            <span className="text-[10px] font-normal text-violet-600 dark:text-violet-400">(Unsubscribe URL)</span>
          </button>
          <button
            type="button"
            title="Click to insert {{to}} — Target recipient email address"
            onClick={() => insertAtCursor('{{to}}')}
            className="group flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 shadow-sm transition hover:border-violet-400 hover:bg-violet-100 dark:border-violet-800/60 dark:bg-violet-950/50 dark:text-violet-300 dark:hover:bg-violet-900/60"
          >
            <span className="text-violet-500 dark:text-violet-400">+</span>
            <code className="font-mono text-[11px] font-bold">{'{{to}}'}</code>
            <span className="text-[10px] font-normal text-violet-600 dark:text-violet-400">(Recipient Email)</span>
          </button>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800/80" />

        {/* Discovered Custom Variables (Non-clickable List) & Resolved Embeds */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Discovered Variables:
            </span>
            {placeholders.filter((p) => p !== 'unsubscribe_link' && p !== 'to').length === 0 ? (
              <span className="text-xs text-slate-400">No custom variables discovered yet</span>
            ) : (
              placeholders
                .filter((p) => p !== 'unsubscribe_link' && p !== 'to')
                .map((p) => (
                  <span
                    key={p}
                    className="flex items-center rounded-xl border border-slate-200/80 bg-slate-100/80 px-2.5 py-0.5 font-mono text-[11px] font-medium text-slate-700 select-all dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-slate-300"
                  >
                    {`{{${p}}}`}
                  </span>
                ))
            )}
          </div>

          {embeds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Resolved Embeds ({embeds.length}):
              </span>
              {embeds.map((emb) => (
                <span
                  key={emb.id}
                  className="flex items-center gap-1 rounded-xl border border-emerald-200/60 bg-emerald-50/70 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>{emb.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor & Preview Split View */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" style={{ minHeight: '620px' }}>
        {/* Left Column: Code Editor */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              HTML / Handlebars Source
            </label>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>{'{{var}}'}</span>
              <span>•</span>
              <span>{'{{{raw}}}'}</span>
              <span>•</span>
              <span>{'{{embed "id"}}'}</span>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 font-mono text-xs text-slate-900 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/20 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-100 dark:focus:bg-slate-800"
            spellCheck={false}
          />
        </div>

        {/* Right Column: Multi-tab Preview & Output Inspector */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
          {/* Tabs Bar */}
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === 'preview'
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                Visual Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('html')}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === 'html'
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                Compiled HTML Output
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('variables')}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === 'variables'
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <span>Test Variables</span>
                {placeholders.length > 0 && (
                  <span className="rounded-full bg-violet-100 px-1.5 py-0.2 text-[10px] font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                    {placeholders.length}
                  </span>
                )}
              </button>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              {activeTab === 'preview' && (
                <div className="flex items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${
                      previewDevice === 'desktop'
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                        : 'text-slate-500'
                    }`}
                  >
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${
                      previewDevice === 'mobile'
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                        : 'text-slate-500'
                    }`}
                  >
                    Mobile (375px)
                  </button>
                </div>
              )}

              {activeTab === 'html' && (
                <button
                  type="button"
                  onClick={handleCopyCompiledHtml}
                  className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {copiedHtml ? '✓ Copied' : 'Copy HTML Output'}
                </button>
              )}

              {compiling && (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
              )}
            </div>
          </div>

          {/* Compilation Error Banner */}
          {compileError && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <span className="font-semibold">Compilation Error:</span> {compileError}
            </div>
          )}

          {/* Tab 1: Visual Rendered Preview */}
          {activeTab === 'preview' && (
            <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100/70 p-2 dark:border-slate-800 dark:bg-slate-950/50">
              <iframe
                title="live-compiled-preview"
                srcDoc={compiledHtml || htmlContent}
                className="h-full rounded-lg bg-white shadow-sm transition-all dark:bg-slate-900"
                style={{
                  width: previewDevice === 'mobile' ? '375px' : '100%',
                  minHeight: '520px',
                }}
              />
            </div>
          )}

          {/* Tab 2: Compiled HTML Source Code Inspector */}
          {activeTab === 'html' && (
            <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-xs text-slate-100 dark:border-slate-800">
              <pre className="whitespace-pre-wrap select-all">{compiledHtml}</pre>
            </div>
          )}

          {/* Tab 3: Interactive Test Variables Panel */}
          {activeTab === 'variables' && (
            <div className="flex-1 overflow-y-auto space-y-3 p-1">
              <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3 text-xs text-violet-900 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200">
                <span className="font-semibold">Sample Data Editor:</span> Change these test values to see how Handlebars conditions, loops, and variables render in the live preview.
              </div>

              {placeholders.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No placeholders in this template yet. Add variables like <code className="font-mono">{'{{username}}'}</code> or embed sub-templates to test data.
                </div>
              ) : (
                placeholders.map((p) => (
                  <div key={p} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <label className="mb-1 block font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {`{{${p}}}`}
                    </label>
                    <input
                      type="text"
                      value={sampleVariables[p] ?? ''}
                      onChange={(e) =>
                        setSampleVariables((prev) => ({
                          ...prev,
                          [p]: e.target.value,
                        }))
                      }
                      placeholder={`Value for ${p}`}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Asset Picker Modal */}
      {showAssetPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowAssetPicker(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">Choose Asset to Insert</h3>
              <button
                onClick={() => setShowAssetPicker(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <input
                type="text"
                placeholder="Filter images..."
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs outline-none focus:border-violet-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingAssets ? (
                <div className="py-8 text-center text-xs text-slate-500">Loading assets…</div>
              ) : filteredAssets.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No assets found. Upload images in the Asset Library first.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {filteredAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900 shadow-sm"
                    >
                      <img
                        src={asset.urlPath}
                        alt={asset.originalName}
                        className="h-24 w-full rounded-xl object-cover"
                      />
                      <p className="mt-1.5 truncate text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {asset.originalName}
                      </p>
                      <div className="mt-2 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleInsertAsset(asset, 'img')}
                          className="flex-1 rounded-lg bg-violet-600 py-1 text-[10px] font-semibold text-white hover:bg-violet-700"
                        >
                          + &lt;img&gt;
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertAsset(asset, 'url')}
                          className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                        >
                          + URL
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 bg-slate-50/80 px-6 py-3 dark:border-slate-800 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={() => setShowAssetPicker(false)}
                className="rounded-xl bg-slate-200 px-4 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embed Template Picker Modal */}
      {showEmbedPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowEmbedPicker(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">Choose Template to Embed</h3>
              <button
                onClick={() => setShowEmbedPicker(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {availableTemplates.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No other templates available to embed.
                </div>
              ) : (
                availableTemplates.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleInsertEmbed(t.id)}
                    className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 p-3.5 transition hover:border-violet-400 hover:bg-violet-50/40 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">{t.name}</h4>
                      {t.description && (
                        <p className="text-[11px] text-slate-400">{t.description}</p>
                      )}
                    </div>
                    <span className="rounded-lg bg-violet-100 px-2.5 py-1 text-[10px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                      Embed
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 bg-slate-50/80 px-6 py-3 dark:border-slate-800 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={() => setShowEmbedPicker(false)}
                className="rounded-xl bg-slate-200 px-4 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Examples Modal */}
      {showUsageModal && (
        <TemplateUsageModal
          template={{ id: id || '', name: name || 'Template', placeholders }}
          isOpen={showUsageModal}
          onClose={() => setShowUsageModal(false)}
        />
      )}
    </div>
  );
}
