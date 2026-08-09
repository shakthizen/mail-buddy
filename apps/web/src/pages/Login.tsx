import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { MailBuddyClient, MailBuddyApiError } from 'mail-buddy-sdk';
import { useAuth } from '../lib/auth';

export function Login() {
  const { apiKey, login } = useAuth();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  if (apiKey) return <Navigate to="/templates" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setChecking(true);
    try {
      const client = new MailBuddyClient({ baseUrl: window.location.origin, apiKey: value.trim() });
      await client.templates.list({ limit: 1 });
      login(value.trim());
    } catch (err) {
      setError(err instanceof MailBuddyApiError ? err.message : 'Could not reach the Mail Buddy server');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-neutral-50 p-4 dark:bg-neutral-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      >
        <h1 className="mb-1 text-lg font-semibold text-neutral-900 dark:text-white">Mail Buddy</h1>
        <p className="mb-4 text-sm text-neutral-500">
          Paste the admin API key printed to the server console on first boot.
        </p>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="mb_..."
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
        />
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={!value || checking}
          className="mt-4 w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {checking ? 'Checking…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
