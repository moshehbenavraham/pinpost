import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only initialize Supabase client on the browser
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    let subscription: { unsubscribe: () => void } | undefined;

    // Dynamic import so the module (and createClient) only runs client-side
    import("@/integrations/supabase/client")
      .then(({ supabase }) => {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        });
        subscription = data.subscription;

        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        });
      })
      .catch(() => {
        setLoading(false);
      });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (typeof window === "undefined") return;
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext>
  );
}
