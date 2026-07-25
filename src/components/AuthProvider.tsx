import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isGuest: boolean;
  loginAsGuest: () => void;
  signOut: () => Promise<void>;
}

const GUEST_USER: User = {
  id: 'guest-local-test-user',
  app_metadata: { provider: 'guest' },
  user_metadata: { name: 'Local Guest Tester', email: 'guest@localhost' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'guest@localhost',
  phone: '',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
};

const GUEST_SESSION: Session = {
  access_token: 'guest-mock-token',
  refresh_token: 'guest-mock-refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: GUEST_USER,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const checkGuestMode = () => localStorage.getItem('alex_logistics_guest_mode') === 'true';

  useEffect(() => {
    if (checkGuestMode()) {
      setSession(GUEST_SESSION);
      setUser(GUEST_USER);
      setIsGuest(true);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!checkGuestMode()) {
        setSession(session);
        setUser(session?.user ?? null);
        setIsGuest(false);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!checkGuestMode()) {
        setSession(session);
        setUser(session?.user ?? null);
        setIsGuest(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginAsGuest = () => {
    localStorage.setItem('alex_logistics_guest_mode', 'true');
    setSession(GUEST_SESSION);
    setUser(GUEST_USER);
    setIsGuest(true);
    setLoading(false);
  };

  const signOut = async () => {
    if (checkGuestMode()) {
      localStorage.removeItem('alex_logistics_guest_mode');
      setSession(null);
      setUser(null);
      setIsGuest(false);
      return;
    }
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session, user, isGuest, loginAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

