import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoaded: boolean;
  isSignedIn: boolean;
};

type SignOutOptions = { redirectUrl?: string };
type AuthChangeListener = (payload: { user: User | null }) => void;

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoaded: false,
  isSignedIn: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, isLoaded, isSignedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  const { isLoaded, isSignedIn, user, session } = context;
  const signOut = useCallback(async (_options?: SignOutOptions) => {
    await supabase.auth.signOut();
  }, []);
  return useMemo(() => ({
    isLoaded,
    isSignedIn,
    userId: user?.id,
    sessionId: session?.access_token,
    session,
    user,
    signOut,
  }), [isLoaded, isSignedIn, user, session, signOut]);
}

export function useUser() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useUser must be used within an AuthProvider');
  
  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    user: context.user ? {
      id: context.user.id,
      fullName: context.user.user_metadata?.full_name || 'Lycée Student',
      firstName: context.user.user_metadata?.first_name || context.user.user_metadata?.given_name || '',
      lastName: context.user.user_metadata?.last_name || context.user.user_metadata?.family_name || '',
      imageUrl: context.user.user_metadata?.avatar_url || 'https://www.gravatar.com/avatar/?d=mp',
      primaryEmailAddress: { emailAddress: context.user.email },
    } : null,
  };
}

export function useAuthActions() {
  const signOut = useCallback(async (_options?: SignOutOptions) => {
    await supabase.auth.signOut();
  }, []);
  const addListener = useCallback((listener: AuthChangeListener) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      listener({ user: session?.user ?? null });
    });
    return () => subscription.unsubscribe();
  }, []);
  return useMemo(() => ({ signOut, addListener }), [signOut, addListener]);
}

export function SignIn({ routing, path, signUpUrl }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
  };

  return (
    <div className="w-full max-w-sm rounded-[var(--m3-radius-xl)] bg-[hsl(var(--m3-surface))] p-8 shadow-[var(--shadow-m3-elevation-2)] border border-[hsl(var(--m3-outline-variant))]">
      <h2 className="mb-6 text-center text-2xl font-bold text-[hsl(var(--m3-on-surface))]">Welcome Back</h2>
      <form onSubmit={handleSignIn} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-[hsl(var(--m3-on-surface))]">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 w-full rounded-[var(--m3-radius-md)] border border-[hsl(var(--m3-outline))] bg-[hsl(var(--m3-surface-variant))] px-4 py-3 text-sm text-[hsl(var(--m3-on-surface))] outline-none focus:border-[hsl(var(--m3-primary))] transition-colors" />
        </div>
        <div>
          <label className="text-sm font-medium text-[hsl(var(--m3-on-surface))]">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 w-full rounded-[var(--m3-radius-md)] border border-[hsl(var(--m3-outline))] bg-[hsl(var(--m3-surface-variant))] px-4 py-3 text-sm text-[hsl(var(--m3-on-surface))] outline-none focus:border-[hsl(var(--m3-primary))] transition-colors" />
        </div>
        {error && <p className="text-sm text-[hsl(var(--m3-error))]">{error}</p>}
        <button type="submit" className="mt-4 rounded-[var(--m3-radius-md)] bg-[hsl(var(--m3-primary))] py-3 text-center font-bold text-[hsl(var(--m3-on-primary))] hover:bg-[hsl(var(--m3-primary))]/90 transition-colors">Sign In</button>
      </form>
      <div className="mt-6 text-center text-sm text-[hsl(var(--m3-on-surface-variant))]">
        Don't have an account? <a href={signUpUrl} className="font-bold text-[hsl(var(--m3-primary))] hover:underline">Sign up</a>
      </div>
    </div>
  );
}

export function SignUp({ routing, path, signInUrl }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-sm rounded-[var(--m3-radius-xl)] bg-[hsl(var(--m3-surface))] p-8 text-center shadow-[var(--shadow-m3-elevation-2)] border border-[hsl(var(--m3-outline-variant))]">
        <h2 className="mb-4 text-xl font-bold text-[hsl(var(--m3-on-surface))]">Check your email</h2>
        <p className="text-[hsl(var(--m3-on-surface-variant))]">We've sent a confirmation link to {email}. Please verify your email to continue.</p>
        <a href={signInUrl} className="mt-6 block font-bold text-[hsl(var(--m3-primary))] hover:underline">Return to sign in</a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-[var(--m3-radius-xl)] bg-[hsl(var(--m3-surface))] p-8 shadow-[var(--shadow-m3-elevation-2)] border border-[hsl(var(--m3-outline-variant))]">
      <h2 className="mb-6 text-center text-2xl font-bold text-[hsl(var(--m3-on-surface))]">Create Account</h2>
      <form onSubmit={handleSignUp} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-[hsl(var(--m3-on-surface))]">Full Name</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className="mt-1 w-full rounded-[var(--m3-radius-md)] border border-[hsl(var(--m3-outline))] bg-[hsl(var(--m3-surface-variant))] px-4 py-3 text-sm text-[hsl(var(--m3-on-surface))] outline-none focus:border-[hsl(var(--m3-primary))] transition-colors" />
        </div>
        <div>
          <label className="text-sm font-medium text-[hsl(var(--m3-on-surface))]">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 w-full rounded-[var(--m3-radius-md)] border border-[hsl(var(--m3-outline))] bg-[hsl(var(--m3-surface-variant))] px-4 py-3 text-sm text-[hsl(var(--m3-on-surface))] outline-none focus:border-[hsl(var(--m3-primary))] transition-colors" />
        </div>
        <div>
          <label className="text-sm font-medium text-[hsl(var(--m3-on-surface))]">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="mt-1 w-full rounded-[var(--m3-radius-md)] border border-[hsl(var(--m3-outline))] bg-[hsl(var(--m3-surface-variant))] px-4 py-3 text-sm text-[hsl(var(--m3-on-surface))] outline-none focus:border-[hsl(var(--m3-primary))] transition-colors" />
        </div>
        {error && <p className="text-sm text-[hsl(var(--m3-error))]">{error}</p>}
        <button type="submit" className="mt-4 rounded-[var(--m3-radius-md)] bg-[hsl(var(--m3-primary))] py-3 text-center font-bold text-[hsl(var(--m3-on-primary))] hover:bg-[hsl(var(--m3-primary))]/90 transition-colors">Sign Up</button>
      </form>
      <div className="mt-6 text-center text-sm text-[hsl(var(--m3-on-surface-variant))]">
        Already have an account? <a href={signInUrl} className="font-bold text-[hsl(var(--m3-primary))] hover:underline">Sign in</a>
      </div>
    </div>
  );
}