import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, db } from "./supabase";
import type { Profile } from "./types";
import { errorMessage } from "./utils";
type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string;
  recovering: boolean;
  endRecovery: () => void;
  refresh: () => Promise<void>;
};
const Context = createContext<AuthState>(null!);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState("");
  const [recovering, setRecovering] = useState(false);
  async function refresh() {
    const {
      data: { user },
    } = await db().auth.getUser();
    if (!user) {
      setProfile(null);
      return;
    }
    const { data, error } = await db()
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error) throw error;
    setProfile(data as Profile);
  }
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (!next) {
        setProfile(null);
        setLoading(false);
        setRecovering(false);
      }
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (active) {
        if (error) setError(errorMessage(error));
        setSession(data.session);
        if (!data.session) setLoading(false);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!session?.user.id) return;
    let active = true;
    setLoading(true);
    setError("");
    db()
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (active) {
          setProfile(data as Profile | null);
          setError(error ? errorMessage(error) : "");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [session?.user.id]);
  return (
    <Context.Provider
      value={{
        session,
        profile,
        loading,
        error,
        recovering,
        endRecovery: () => setRecovering(false),
        refresh,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
