import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MailBuddyClient, type User } from 'mail-buddy-sdk';

const TOKEN_KEY = 'mail-buddy-auth-token';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  initialized: boolean | null;
  loading: boolean;
  client: MailBuddyClient;
  setup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithApiKey: (key: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const client = useMemo(
    () => new MailBuddyClient({ baseUrl: window.location.origin, apiKey: token ?? undefined }),
    [token],
  );

  async function checkStatus() {
    try {
      const res = await client.auth.status();
      setInitialized(res.initialized);
      if (res.user) {
        setUser(res.user);
      } else if (token) {
        // If token is an API key, synthesize user or fetch me
        if (token.startsWith('mb_')) {
          setUser({
            id: 'api-key-user',
            name: 'API Key Admin',
            email: 'apikey@mail-buddy',
            role: 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } else {
          try {
            const me = await client.auth.me();
            setUser(me.user);
          } catch {
            // Token expired or invalid
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
            setUser(null);
          }
        }
      }
    } catch {
      // Offline / connecting error
      setInitialized(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const setup = async (name: string, email: string, password: string) => {
    const res = await client.auth.setup({ name, email, password });
    localStorage.setItem(TOKEN_KEY, res.token);
    setToken(res.token);
    setUser(res.user);
    setInitialized(true);
  };

  const login = async (email: string, password: string) => {
    const res = await client.auth.login({ email, password });
    localStorage.setItem(TOKEN_KEY, res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const loginWithApiKey = async (key: string) => {
    localStorage.setItem(TOKEN_KEY, key);
    setToken(key);
    setUser({
      id: 'api-key-user',
      name: 'API Key User',
      email: 'apikey@mail-buddy',
      role: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const logout = async () => {
    try {
      if (token?.startsWith('mbs_')) {
        await client.auth.logout();
      }
    } catch {
      // ignore
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        initialized,
        loading,
        client,
        setup,
        login,
        loginWithApiKey,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useClient() {
  const { client } = useAuth();
  return client;
}
