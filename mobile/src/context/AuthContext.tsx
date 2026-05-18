import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { getStoredToken, setStoredToken } from '../auth';
import type { User } from '../types';

type AuthContextValue = {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  signIn: (token: string, user: User) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  isLoading: true,
  signIn: () => undefined,
  signOut: async () => undefined,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Відновлення сесії при запуску
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await getStoredToken();
        if (!stored) return;

        const me = await apiFetch<User>('/user', { token: stored });
        if (!cancelled) {
          setToken(stored);
          setUser(me);
        }
      } catch {
        // Токен протух або невалідний — очищаємо
        await setStoredToken(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setIsLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (token) {
        await apiFetch('/auth/logout', { method: 'POST', token });
      }
    } catch {
      // Ігноруємо помилки сервера при logout
    } finally {
      await setStoredToken(null);
      setToken(null);
      setUser(null);
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
