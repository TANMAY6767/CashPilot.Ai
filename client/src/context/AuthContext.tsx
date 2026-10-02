
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as api from '@/services/api';
import type { User } from '@/types';


interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  let cancelled = false;
  const handleSessionExpired = () => {
    if (!cancelled) {
      setUser(null);
      setLoading(false);
    }
  };
  window.addEventListener('auth:expired', handleSessionExpired);

  const restoreSession = async () => {
    try {
      await api.restoreAccessToken();
      const u = await api.getCurrentUser();
      if (!cancelled) {
        setUser(u);
      }
    } catch {
      if (!cancelled) {
        setUser(null);
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  };

  restoreSession();
  return () => {
    cancelled = true;
    window.removeEventListener('auth:expired', handleSessionExpired);
  };
}, []);


  const login = async (email: string, password: string) => {
  const { user } = await api.login(email, password);

  setUser(user);
};

  const signup = async (
  name: string,
  email: string,
  password: string,
) => {
  const { user } = await api.signup(name, email, password);

  setUser(user);
};

  const logout = async () => {
  try {
    await api.logout();
  } finally {
    api.clearAccessToken();
    setUser(null);
  }
};

  const value = useMemo<AuthState>(
  () => ({
    user,
    loading,
    login,
    signup,
    logout,
  }),
  [user, loading],
);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
