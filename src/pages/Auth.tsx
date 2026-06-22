import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Zap } from "lucide-react";
import { usePageMeta } from "@/lib/usePageMeta";

const REMEMBER_KEY = "profx.rememberMe";

export default function AuthPage() {
  usePageMeta({
    title: "ProFX.ai | Premium AI Thumbnail & Logo Generator for Gamers",
    description: "Sign in or create a free ProFX.ai account to generate AI thumbnails, logos and clips.",
  });
  const { user, loading } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(REMEMBER_KEY) !== "false";
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setErr(null);
    setMsg(null);
  }, [mode]);

  if (loading) return null;
  if (user) {
    const to = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/";
    return <Navigate to={to} replace />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      if (!email || !password) {
        throw new Error("Email and password are required");
      }
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        // Auto-confirm is enabled, so sign in immediately.
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          setMsg("Account created! Please sign in.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-[10%] h-[28rem] w-[28rem] rounded-full bg-[oklch(0.7_0.28_350/0.25)] blur-3xl animate-float" />
        <div
          className="absolute top-[30%] right-[-6rem] h-[26rem] w-[26rem] rounded-full bg-[oklch(0.86_0.18_190/0.22)] blur-3xl animate-float"
          style={{ animationDelay: "-3s" }}
        />
        <div className="bg-grid absolute inset-0 opacity-[0.18] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      </div>

      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[oklch(0.7_0.28_350)] to-[oklch(0.86_0.18_190)] font-display text-base font-bold text-background shadow-[0_0_20px_oklch(0.7_0.28_350/0.5)]">
            P
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            ProFX<span className="text-accent">.ai</span>
          </span>
        </Link>

        <div className="bento-tile p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
              <Zap className="h-3 w-3" /> {mode === "signup" ? "Create account" : "Welcome back"}
            </div>
            <h1 className="mt-3 text-3xl font-bold">
              {mode === "signup" ? (
                <>Start with <span className="text-gradient-pink-cyan">3 free credits</span></>
              ) : (
                <>Sign in to <span className="text-gradient-pink-cyan">ProFX.ai</span></>
              )}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signup"
                ? "AI thumbnails, logos and cinematic clips — all in one studio."
                : "Pick up where you left off."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {err && <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{err}</p>}
            {msg && <p className="rounded-lg border border-accent/40 bg-accent/10 p-2 text-xs text-accent">{msg}</p>}

            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-background accent-[oklch(0.7_0.28_350)]"
              />
              Keep me signed in on this device
            </label>

            <Button
              type="submit"
              disabled={busy}
              size="lg"
              className="w-full bg-primary text-primary-foreground glow-pink hover:brightness-110"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              className="font-semibold text-accent hover:underline"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? "Sign in" : "Create a free account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}