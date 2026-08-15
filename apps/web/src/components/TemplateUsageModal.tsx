import { useState } from 'react';
import type { Template } from 'mail-buddy-sdk';

interface TemplateUsageModalProps {
  template: Pick<Template, 'id' | 'name' | 'placeholders'>;
  isOpen: boolean;
  onClose: () => void;
}

export function TemplateUsageModal({ template, isOpen, onClose }: TemplateUsageModalProps) {
  const [activeTab, setActiveTab] = useState<'sdk' | 'fetch' | 'curl'>('sdk');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const baseUrl = window.location.origin;

  // Build realistic sample variables (excluding auto-injected system variables like unsubscribe_link)
  const userVariables = template.placeholders.filter((p) => p !== 'unsubscribe_link');
  const hasUnsubscribe = template.placeholders.includes('unsubscribe_link');

  const sampleVars: Record<string, string> = {};
  for (const p of userVariables) {
    const lower = p.toLowerCase();
    if (lower.includes('email') || lower === 'to') {
      sampleVars[p] = 'user@example.com';
    } else if (lower.includes('name') || lower === 'username') {
      sampleVars[p] = 'Alex Smith';
    } else if (lower.includes('company') || lower.includes('organization')) {
      sampleVars[p] = 'Acme Corp';
    } else if (lower.includes('order') || lower.includes('id')) {
      sampleVars[p] = 'ORD-12345';
    } else if (lower.includes('url') || lower.includes('link')) {
      sampleVars[p] = 'https://example.com/action';
    } else {
      sampleVars[p] = `Sample ${p}`;
    }
  }

  const varsJson = JSON.stringify(sampleVars, null, 4);
  const varsJsonIndented = varsJson
    .split('\n')
    .map((line, i) => (i === 0 ? line : '      ' + line))
    .join('\n');

  const curlSnippet = `curl -X POST "${baseUrl}/api/send" \\
  -H "Authorization: Bearer mb_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "recipient@example.com",
    "subject": "Hello from Mail Buddy",
    "templateId": "${template.id}",
    "variables": ${varsJsonIndented}
  }'`;

  const fetchSnippet = `const response = await fetch('${baseUrl}/api/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer mb_YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'recipient@example.com',
    subject: 'Hello from Mail Buddy',
    templateId: '${template.id}',
    variables: ${varsJsonIndented},
  }),
});

const data = await response.json();
console.log(data);`;

  const sdkSnippet = `import { MailBuddyClient } from 'mail-buddy-sdk';

const client = new MailBuddyClient({
  baseUrl: '${baseUrl}',
  apiKey: 'mb_YOUR_API_KEY',
});

const result = await client.send({
  to: 'recipient@example.com',
  subject: 'Hello from Mail Buddy',
  templateId: '${template.id}',
  variables: ${varsJsonIndented},
});

console.log(result.results);`;

  const snippets = {
    curl: curlSnippet,
    fetch: fetchSnippet,
    sdk: sdkSnippet,
  };

  const currentCode = snippets[activeTab];

  function handleCopy() {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">API Usage & Code Examples</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Trigger sends for <strong className="font-semibold text-slate-700 dark:text-slate-200">{template.name}</strong> from your applications
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            ✕
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-6 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('sdk')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'sdk'
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              Client SDK (Node/TS)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('fetch')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'fetch'
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              Fetch (JavaScript)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('curl')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'curl'
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              cURL (Terminal)
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
              />
            </svg>
            <span>{copied ? '✓ Copied' : 'Copy Code'}</span>
          </button>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto bg-slate-950 p-6 font-mono text-xs text-slate-200">
          <pre className="select-all whitespace-pre-wrap">{currentCode}</pre>
        </div>

        {/* Auto-injected system variable notice */}
        {hasUnsubscribe && (
          <div className="border-t border-slate-200 bg-violet-50/50 px-6 py-2 text-[11px] text-violet-800 dark:border-slate-800 dark:bg-violet-950/30 dark:text-violet-300">
            ℹ️ <strong className="font-semibold">unsubscribe_link</strong> is automatically generated and injected by Mail Buddy at delivery time — no need to pass it in your API call.
          </div>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-3 dark:border-slate-800 dark:bg-slate-800/40 text-[11px] text-slate-500 dark:text-slate-400">
          <span>Replace <code className="font-mono text-violet-600 dark:text-violet-400">mb_YOUR_API_KEY</code> with a key from <strong>Configuration &gt; API Keys</strong></span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-200 px-4 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
