import { useEffect, useState } from 'react';
import { useClient } from '../../lib/auth';

export function Smtp() {
  const client = useClient();

  // SMTP Settings
  const [host, setHost] = useState('');
  const [port, setPort] = useState(587);
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(false);
  const [fromAddress, setFromAddress] = useState('');
  const [fromName, setFromName] = useState('');

  // State indicators
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Test Email State
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    client.settings.get().then((s) => {
      setHost(s.smtp.host);
      setPort(s.smtp.port);
      setUser(s.smtp.user);
      setPassword(s.smtp.password);
      setSecure(s.smtp.secure);
      setFromAddress(s.smtp.fromAddress ?? '');
      setFromName(s.smtp.fromName ?? '');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await client.settings.update({
        smtp: {
          host,
          port,
          user,
          password,
          secure,
          fromAddress,
          fromName,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTestEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!testEmailTo) return;
    setTestingEmail(true);
    setTestEmailResult(null);
    try {
      const res = await client.settings.testEmail({ to: testEmailTo });
      setTestEmailResult({ success: true, message: res.message });
    } catch (err: any) {
      setTestEmailResult({
        success: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTestingEmail(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-xs outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-800 dark:bg-slate-800/90 dark:text-white';
  const labelClass = 'mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300';

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">SMTP Email Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure outbound mail server credentials and test deliverability
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-xs font-semibold text-white shadow-sm shadow-violet-500/20 hover:bg-violet-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save SMTP Settings'}
        </button>
      </div>

      {saved && (
        <div className="rounded-xl border border-green-200 bg-green-50/80 p-3.5 text-xs text-green-700 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300">
          ✓ SMTP settings saved successfully to database!
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* SMTP Card */}
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Outbound Mail Server
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Credentials used by the background delivery worker
            </p>
          </div>
          <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700 dark:bg-violet-950 dark:text-violet-300">
            {host ? 'Configured' : 'Not Configured'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>SMTP Host</label>
            <input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="smtp.mailtrap.io or smtp.gmail.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              placeholder="587"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Username</label>
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="smtp_username"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Default From Address</label>
            <input
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
              placeholder="no-reply@yourdomain.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Default From Name</label>
            <input
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Mail Buddy Support"
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={secure}
                onChange={(e) => setSecure(e.target.checked)}
                className="rounded text-violet-600 focus:ring-violet-500"
              />
              Enable TLS (SSL/TLS direct connection on port 465; leave unchecked for STARTTLS on 587/25)
            </label>
          </div>
        </div>

        {/* Test Email Section */}
        <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Send Real-Time Test Email
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Save changes first, then send an instant verification email to test your SMTP configuration.
          </p>

          <form onSubmit={handleSendTestEmail} className="mt-3 flex gap-2">
            <input
              type="email"
              required
              value={testEmailTo}
              onChange={(e) => setTestEmailTo(e.target.value)}
              placeholder="your-email@example.com"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <button
              type="submit"
              disabled={testingEmail || !testEmailTo}
              className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {testingEmail ? 'Sending Test…' : 'Send Test Email'}
            </button>
          </form>

          {testEmailResult && (
            <div
              className={`mt-3 rounded-xl p-3 text-xs ${
                testEmailResult.success
                  ? 'border border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/60 dark:text-green-300'
                  : 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/60 dark:text-red-300'
              }`}
            >
              <p className="font-semibold">{testEmailResult.success ? '✓ Delivery Successful!' : '✕ SMTP Connection Failed'}</p>
              <p className="mt-1 font-mono text-[11px]">{testEmailResult.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
