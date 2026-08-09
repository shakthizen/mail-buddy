import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { MailBuddyClient } from 'mail-buddy-sdk';

const STORAGE_KEY = 'mail-buddy-api-key';

interface AuthContextValue {
  apiKey: string | null;
  client: MailBuddyClient | null;
  login: (apiKey: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));

  const client = useMemo(
    () => (apiKey ? new MailBuddyClient({ baseUrl: window.location.origin, apiKey }) : null),
    [apiKey],
  );

  const login = (key: string) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
  };

  return <AuthContext.Provider value={{ apiKey, client, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Convenience hook for the common case - throws in dev if used while logged out,
 * since protected routes should never render without a client. */
export function useClient() {
  const { client } = useAuth();
  if (!client) throw new Error('useClient called while logged out');
  return client;
}
