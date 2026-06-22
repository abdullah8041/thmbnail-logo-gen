import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const ADMIN_EMAIL = "mianhadirkhalil16@gmail.com";

export type Profile = {
  id: string;
  email: string;
  credits: number;
  status: "free" | "premium";
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  showNoCredits: boolean;
  setShowNoCredits: (v: boolean) => void;
  consumeCredit: () => Promise<boolean>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNoCredits, setShowNoCredits] = useState(false);

  const loadProfile = useCallback(async (u: User | null) => {
    if (!u) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id,email,credits,status").eq("id", u.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.id),
    ]);
    if (prof) {
      setProfile({
        id: prof.id,
        email: prof.email,
        credits: prof.credits,
        status: (prof.status as "free" | "premium") ?? "free",
      });
    }
    setIsAdmin(
      (roles ?? []).some((r) => r.role === "admin") ||
        u.email?.toLowerCase() === ADMIN_EMAIL,
    );
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setTimeout(() => loadProfile(s?.user ?? null), 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      loadProfile(data.session?.user ?? null).finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  // Realtime: listen for changes to the current user's profile row
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`profile:${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as { id: string; email: string; credits: number; status: string };
          setProfile({
            id: row.id,
            email: row.email,
            credits: row.credits,
            status: (row.status as "free" | "premium") ?? "free",
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const refreshProfile = useCallback(async () => {
    await loadProfile(user);
  }, [loadProfile, user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
  }, []);

  const consumeCredit = useCallback(async () => {
    if (!user) return false;
    const { data, error } = await supabase.rpc("consume_credit");
    if (error || data === -1 || data === null) {
      setShowNoCredits(true);
      return false;
    }
    setProfile((p) => (p ? { ...p, credits: data } : p));
    return true;
  }, [user]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      session,
      profile,
      isAdmin,
      loading,
      refreshProfile,
      signOut,
      showNoCredits,
      setShowNoCredits,
      consumeCredit,
    }),
    [user, session, profile, isAdmin, loading, refreshProfile, signOut, showNoCredits, consumeCredit],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function FullScreenSpinner() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}