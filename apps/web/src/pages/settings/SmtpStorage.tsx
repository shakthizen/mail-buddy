import { useEffect, useState } from 'react';
import { useClient } from '../../lib/auth';

export function SmtpStorage() {
  const client = useClient();
  const [host, setHost] = useState('');
  const [port, setPort] = useState(587);
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(false);
  const [provider, setProvider] = useState<'local' | 's3'>('local');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    client.settings.get().then((s) => {
      setHost(s.smtp.host);
      setPort(s.smtp.port);
      setUser(s.smtp.user);
      setPassword(s.smtp.password);
      setSecure(s.smtp.secure);
      setProvider(s.storage.provider);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await client.settings.update({
        smtp: { host, port, user, password, secure },
        storage: { provider },
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white';
  const labelClass = 'mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300';

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-xl font-semibold text-neutral-900 dark:text-white">SMTP & Storage</h1>

      <h2 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">SMTP</h2>
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Host</label>
          <input value={host} onChange={(e) => setHost(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Port</label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>User</label>
          <input value={user} onChange={(e) => setUser(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <label className="col-span-2 flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} />
          Use TLS (secure)
        </label>
      </div>

      <h2 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Storage</h2>
      <div className="mb-6">
        <label className={labelClass}>Provider</label>
        <select value={provider} onChange={(e) => setProvider(e.target.value as 'local' | 's3')} className={inputClass}>
          <option value="local">local</option>
          <option value="s3" disabled>
            s3 (not yet implemented)
          </option>
        </select>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      {saved && <span className="ml-3 text-sm text-green-600 dark:text-green-400">Saved</span>}
    </div>
  );
}
