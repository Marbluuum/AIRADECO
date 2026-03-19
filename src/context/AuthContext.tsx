import { createContext, useContext, useState, type ReactNode } from 'react';

export interface UserProfile {
  id: string;
  name: string;
  role: string;
}

// ─── Vendedores ───────────────────────────────────────────────────────────────
const USERS: (UserProfile & { password: string })[] = [
  { id: '1', name: 'Yanil',   password: 'yanil123',   role: 'vendedor' },
  { id: '2', name: 'Giselle', password: 'giselle123', role: 'vendedor' },
  { id: '3', name: 'Taiel',   password: 'taiel123',   role: 'vendedor' },
];

const SESSION_KEY = 'airadeco_user';

// ─── Context ──────────────────────────────────────────────────────────────────
interface AuthContextValue {
  profile: UserProfile | null;
  signIn: (name: string, password: string) => { error: string | null };
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  function signIn(name: string, password: string): { error: string | null } {
    const user = USERS.find(
      u => u.name.toLowerCase() === name.trim().toLowerCase() && u.password === password,
    );
    if (!user) return { error: 'Usuario o contraseña incorrectos' };

    const p: UserProfile = { id: user.id, name: user.name, role: user.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(p));
    setProfile(p);
    return { error: null };
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ profile, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
