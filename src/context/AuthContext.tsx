import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '../lib/firebase';

export interface UserProfile {
  id: string;
  name: string;
  role: string;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await loadOrCreateProfile(firebaseUser);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });
    return unsub;
  }, []);

  async function loadOrCreateProfile(firebaseUser: User) {
    const ref  = doc(firestore, 'users', firebaseUser.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      setProfile({ id: firebaseUser.uid, ...(snap.data() as { name: string; role: string }) });
    } else {
      // Primera vez que inicia sesión — crear el perfil automáticamente
      const name = firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'Vendedor';
      const newProfile = { name, role: 'vendedor' };
      await setDoc(ref, newProfile);
      setProfile({ id: firebaseUser.uid, ...newProfile });
    }
    setIsLoading(false);
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch {
      return { error: 'Email o contraseña incorrectos' };
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
