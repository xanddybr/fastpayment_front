import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { adminLogout } from '../lib/api';

interface AuthContextValue {
  adminName: string | null;
  login: (fullName: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [adminName, setAdminName] = useState<string | null>(() => localStorage.getItem('admin_full_name'));

  const login = useCallback((fullName: string) => {
    localStorage.setItem('admin_full_name', fullName);
    setAdminName(fullName);
  }, []);

  const logout = useCallback(async () => {
    await adminLogout();
    localStorage.removeItem('admin_full_name');
    setAdminName(null);
  }, []);

  const value = useMemo(() => ({ adminName, login, logout }), [adminName, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
