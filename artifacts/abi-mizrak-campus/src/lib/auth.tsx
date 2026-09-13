import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";
import { Session, User } from "@supabase/supabase-js";

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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, user, isLoaded, isSignedIn: !!user }}
    >
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
  return useMemo(
    () => ({
      isLoaded,
      isSignedIn,
      userId: user?.id,
      sessionId: session?.access_token,
      session,
      user,
      signOut,
    }),
    [isLoaded, isSignedIn, user, session, signOut],
  );
}

export function useUser() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useUser must be used within an AuthProvider");

  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    user: context.user
      ? {
          id: context.user.id,
          fullName: context.user.user_metadata?.full_name || "Lycée Student",
          firstName:
            context.user.user_metadata?.first_name ||
            context.user.user_metadata?.given_name ||
            "",
          lastName:
            context.user.user_metadata?.last_name ||
            context.user.user_metadata?.family_name ||
            "",
          imageUrl:
            context.user.user_metadata?.avatar_url ||
            "https://www.gravatar.com/avatar/?d=mp",
          primaryEmailAddress: { emailAddress: context.user.email },
        }
      : null,
  };
}

export function useAuthActions() {
  const signOut = useCallback(async (_options?: SignOutOptions) => {
    await supabase.auth.signOut();
  }, []);
  const addListener = useCallback((listener: AuthChangeListener) => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      listener({ user: session?.user ?? null });
    });
    return () => subscription.unsubscribe();
  }, []);
  return useMemo(() => ({ signOut, addListener }), [signOut, addListener]);
}

type AuthScreenProps = {
  routing?: string;
  path?: string;
  signUpUrl?: string;
  signInUrl?: string;
};

export function SignIn({ routing, path, signUpUrl }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error.message);
  };

  return (
    <div className="w-full max-w-md rounded-[28px] border border-[#D9D1C2] bg-[#FFFDF8] p-6 shadow-[0_24px_70px_rgba(24,51,44,.12)] sm:p-8">
      <div className="mb-7">
        <div className="font-mono-campus text-[10px] font-bold uppercase tracking-[.18em] text-[#E76F51]">Private campus access</div>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-[-.05em] text-[#18332C]">Welcome back</h2>
        <p className="mt-2 text-sm leading-6 text-[#6C7D76]">Sign in to continue to your school community.</p>
      </div>
      <form onSubmit={handleSignIn} className="flex flex-col gap-5">
        <div>
          <label className="text-sm font-bold text-[#18332C]">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-[#CFC7B8] bg-[#F7F2E9] px-4 py-3.5 text-sm text-[#18332C] outline-none transition-colors placeholder:text-[#9A9A8F] focus:border-[#216F58] focus:ring-4 focus:ring-[#216F58]/10"
          />
        </div>
        <div>
          <label className="text-sm font-bold text-[#18332C]">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-[#CFC7B8] bg-[#F7F2E9] px-4 py-3.5 text-sm text-[#18332C] outline-none transition-colors placeholder:text-[#9A9A8F] focus:border-[#216F58] focus:ring-4 focus:ring-[#216F58]/10"
          />
        </div>
        {error && (
          <p className="text-sm text-[#B42318]">{error}</p>
        )}
        <button
          type="submit"
          className="mt-2 rounded-xl bg-[#216F58] py-3.5 text-center font-bold text-[#F5F0E6] shadow-[3px_3px_0_#D99A2B] transition hover:bg-[#1B5D4A] hover:translate-y-[-1px]"
        >
          Sign In
        </button>
      </form>
      <div className="mt-6 text-center text-sm text-[#6C7D76]">
        Don't have an account?{" "}
        <a
          href={signUpUrl}
          className="font-bold text-[#216F58] hover:underline"
        >
          Sign up
        </a>
      </div>
    </div>
  );
}

export function SignUp({ routing, path, signInUrl }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md rounded-[28px] border border-[#D9D1C2] bg-[#FFFDF8] p-6 text-center shadow-[0_24px_70px_rgba(24,51,44,.12)] sm:p-8">
        <h2 className="mb-4 text-xl font-bold text-[hsl(var(--m3-on-surface))]">
          Check your email
        </h2>
        <p className="text-[#6C7D76]">
          We've sent a confirmation link to {email}. Please verify your email to
          continue.
        </p>
        <a
          href={signInUrl}
          className="mt-6 block font-bold text-[#216F58] hover:underline"
        >
          Return to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-[28px] border border-[#D9D1C2] bg-[#FFFDF8] p-6 shadow-[0_24px_70px_rgba(24,51,44,.12)] sm:p-8">
      <div className="mb-7">
        <div className="font-mono-campus text-[10px] font-bold uppercase tracking-[.18em] text-[#E76F51]">Join the community</div>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-[-.05em] text-[#18332C]">Create your account</h2>
        <p className="mt-2 text-sm leading-6 text-[#6C7D76]">Set up your school identity to request campus access.</p>
      </div>
      <form onSubmit={handleSignUp} className="flex flex-col gap-5">
        <div>
          <label className="text-sm font-bold text-[#18332C]">
            Full Name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-[#CFC7B8] bg-[#F7F2E9] px-4 py-3.5 text-sm text-[#18332C] outline-none transition-colors placeholder:text-[#9A9A8F] focus:border-[#216F58] focus:ring-4 focus:ring-[#216F58]/10"
          />
        </div>
        <div>
          <label className="text-sm font-bold text-[#18332C]">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-[#CFC7B8] bg-[#F7F2E9] px-4 py-3.5 text-sm text-[#18332C] outline-none transition-colors placeholder:text-[#9A9A8F] focus:border-[#216F58] focus:ring-4 focus:ring-[#216F58]/10"
          />
        </div>
        <div>
          <label className="text-sm font-bold text-[#18332C]">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="mt-2 w-full rounded-xl border border-[#CFC7B8] bg-[#F7F2E9] px-4 py-3.5 text-sm text-[#18332C] outline-none transition-colors placeholder:text-[#9A9A8F] focus:border-[#216F58] focus:ring-4 focus:ring-[#216F58]/10"
          />
        </div>
        {error && (
          <p className="text-sm text-[#B42318]">{error}</p>
        )}
        <button
          type="submit"
          className="mt-2 rounded-xl bg-[#216F58] py-3.5 text-center font-bold text-[#F5F0E6] shadow-[3px_3px_0_#D99A2B] transition hover:bg-[#1B5D4A] hover:translate-y-[-1px]"
        >
          Sign Up
        </button>
      </form>
      <div className="mt-6 text-center text-sm text-[#6C7D76]">
        Already have an account?{" "}
        <a
          href={signInUrl}
          className="font-bold text-[#216F58] hover:underline"
        >
          Sign in
        </a>
      </div>
    </div>
  );
}
