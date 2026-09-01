import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getProfile, subscribeToAuthChanges, signOut as signOutService } from "../services/authService";
import type { Profile } from "../types/profile";

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile(userId: string) {
      try {
        const nextProfile = await getProfile(userId);
        if (isMounted) {
          setProfile(nextProfile);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setProfile(null);
          setLoading(false);
          setError(
            "No se pudo cargar tu perfil. Si acabas de registrarte, es posible que la creacion automatica del perfil haya fallado.",
          );
        }
        console.error("[auth] getProfile fallo", err);
      }
    }

    const unsubscribe = subscribeToAuthChanges((nextSession) => {
      if (!isMounted) return;

      setSession(nextSession);
      setError(null);

      if (nextSession) {
        loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await signOutService();
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, error, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return context;
}