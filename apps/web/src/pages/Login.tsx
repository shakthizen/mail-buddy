import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Login() {
  const { user, token, initialized, loading, setup, login, loginWithApiKey } = useAuth();

  // Setup Form state
  const [setupName, setSetupName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');

  // Login Form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // API Key fallback state
  const [useApiKeyMode, setUseApiKeyMode] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (token || user) return <Navigate to="/templates" replace />;

  if (loading || initialized === null) {
    return (
      <div className="app-mesh-bg flex min-h-screen items-center justify-center p-4">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          <span className="text-sm font-medium">Connecting to Mail Buddy…</span>
        </div>
      </div>
    );
  }

  async function handleSetupSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await setup(setupName, setupEmail, setupPassword);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (useApiKeyMode) {
        await loginWithApiKey(apiKeyInput.trim());
      } else {
        await login(loginEmail, loginPassword);
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Check your credentials.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-800 dark:focus:border-violet-500';
  const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300';

  return (
    <div className="app-mesh-bg flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Icon & Heading */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-lg shadow-violet-500/25">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Mail Buddy</h1>
          <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">
            {initialized
              ? 'Self-hosted Email Template Manager & Delivery API'
              : 'Initial Setup — Create Primary Admin Account'}
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-3xl p-8 shadow-xl shadow-slate-950/10">
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          {!initialized ? (
            /* First-Run Setup Wizard */
            <form onSubmit={handleSetupSubmit} className="space-y-4">
              <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-3.5 text-xs text-violet-950 dark:border-violet-800/60 dark:bg-violet-950/50 dark:text-violet-200">
                <span className="font-semibold">👋 Welcome!</span> This instance hasn't been initialized yet. Create your administrator account to get started.
              </div>

              <div>
                <label className={labelClass}>Full Name</label>
                <input
                  required
                  type="text"
                  autoFocus
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  placeholder="e.g. Alex Smith"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Admin Email</label>
                <input
                  required
                  type="email"
                  value={setupEmail}
                  onChange={(e) => setSetupEmail(e.target.value)}
                  placeholder="admin@yourdomain.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Password (min 6 characters)</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/25 transition hover:bg-violet-700 disabled:opacity-50"
              >
                {submitting ? 'Creating Admin Account…' : 'Create Admin & Launch'}
              </button>
            </form>
          ) : (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {!useApiKeyMode ? (
                <>
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <input
                      required
                      type="email"
                      autoFocus
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="admin@yourdomain.com"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Password</label>
                    <input
                      required
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className={labelClass}>Admin API Key</label>
                  <input
                    required
                    type="password"
                    autoFocus
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="mb_..."
                    className={inputClass + ' font-mono'}
                  />
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Use the bootstrap key printed in the server logs or generated in settings.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/25 transition hover:bg-violet-700 disabled:opacity-50"
              >
                {submitting ? 'Signing In…' : 'Sign In'}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setUseApiKeyMode(!useApiKeyMode);
                    setError(null);
                  }}
                  className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
                >
                  {useApiKeyMode ? '← Sign in with Email & Password' : 'Or sign in with an API key'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
