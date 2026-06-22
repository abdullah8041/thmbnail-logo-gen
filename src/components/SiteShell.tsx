import type { ReactNode } from "react";
import { Link, NavLink as RouterNavLink } from "react-router-dom";
import { CreditBadge } from "@/components/CreditBadge";
import { useAuth } from "@/lib/auth";

export function SiteShell({
  children,
  nav,
  action,
}: {
  children: ReactNode;
  nav?: ReactNode;
  action?: ReactNode;
}) {
  const { user, isAdmin } = useAuth();
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-[10%] h-[28rem] w-[28rem] rounded-full bg-[oklch(0.7_0.28_350/0.25)] blur-3xl animate-float" />
        <div
          className="absolute top-[20%] right-[-6rem] h-[26rem] w-[26rem] rounded-full bg-[oklch(0.86_0.18_190/0.18)] blur-3xl animate-float"
          style={{ animationDelay: "-3s" }}
        />
        <div
          className="absolute bottom-[-8rem] left-[30%] h-[30rem] w-[30rem] rounded-full bg-[oklch(0.6_0.25_295/0.25)] blur-3xl animate-float"
          style={{ animationDelay: "-6s" }}
        />
        <div className="bg-grid absolute inset-0 opacity-[0.18] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            {nav}
            <Link to="/" className="group flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[oklch(0.7_0.28_350)] to-[oklch(0.86_0.18_190)] font-display text-sm font-bold text-background shadow-[0_0_20px_oklch(0.7_0.28_350/0.5)]">
                T
              </span>
              <span className="font-display text-base font-bold tracking-tight">
                thumbly<span className="text-accent">.</span>
              </span>
            </Link>
          </div>
          <div className="hidden items-center gap-1 md:flex">
            <NavLink to="/" label="Thumbnails" />
            <NavLink to="/logos" label="Logos" />
            <NavLink to="/pricing" label="Pricing" />
            {isAdmin && <NavLink to="/admin" label="Admin" />}
          </div>
          <div className="flex items-center gap-2">
            {action}
            {user && <CreditBadge />}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pb-24 pt-12 sm:pt-20">
        {children}
      </main>

      <footer className="border-t border-border/40 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>thumbly · neon edition</span>
          <span className="text-accent">// online</span>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <RouterNavLink
      to={to}
      end
      className={({ isActive }) =>
        isActive
          ? "rounded-full border border-primary/30 bg-primary/15 px-3 py-1.5 text-sm text-primary"
          : "rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-accent/10 hover:text-accent"
      }
    >
      {label}
    </RouterNavLink>
  );
}