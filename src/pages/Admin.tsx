import { useEffect, useState } from "react";
import { ShieldCheck, Users, Crown, Coins, RefreshCw, Plus, Loader2, RotateCcw } from "lucide-react";
import { SiteShell } from "@/components/SiteShell";
import { AppNavDrawer } from "@/components/AppNavDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/lib/usePageMeta";

type Row = {
  id: string;
  email: string;
  credits: number;
  status: string;
  created_at: string;
};

export default function AdminPage() {
  usePageMeta({
    title: "ProFX.ai | Premium AI Thumbnail & Logo Generator for Gamers",
    description: "ProFX.ai admin dashboard — manage users, credits and premium access.",
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [amount, setAmount] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id,email,credits,status,created_at")
      .order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addCredits(id: string) {
    const n = parseInt(amount[id] || "10", 10);
    if (!Number.isFinite(n) || n === 0) return;
    setBusy(id);
    await supabase.rpc("admin_add_credits", { _user_id: id, _amount: n });
    await load();
    setBusy(null);
  }

  async function toggleStatus(id: string, current: string) {
    setBusy(id);
    await supabase.rpc("admin_set_status", {
      _user_id: id,
      _status: current === "premium" ? "free" : "premium",
    });
    await load();
    setBusy(null);
  }

  async function resetCredits(id: string) {
    setBusy(id);
    await (supabase.rpc as any)("admin_reset_credits", { _user_id: id, _amount: 3 });
    await load();
    setBusy(null);
  }

  const totalUsers = rows.length;
  const totalPremium = rows.filter((r) => r.status === "premium").length;
  const totalCredits = rows.reduce((a, r) => a + r.credits, 0);

  return (
    <SiteShell nav={<AppNavDrawer />}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
            <ShieldCheck className="h-3 w-3" /> Admin Console
          </div>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
            Command <span className="text-gradient-pink-cyan">center</span>.
          </h1>
        </div>
        <Button variant="outline" onClick={load} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Metric icon={Users} label="Total registered users" value={totalUsers.toString()} accent="cyan" />
        <Metric icon={Crown} label="Total premium users" value={totalPremium.toString()} accent="pink" />
        <Metric icon={Coins} label="Credits in circulation" value={totalCredits.toString()} accent="cyan" />
      </section>

      <section className="mt-8 bento-tile p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">User management</h2>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-accent" />}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-[14rem] truncate font-mono text-xs">{r.email}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">{r.credits}</TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase ${
                        r.status === "premium"
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/60 bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Input
                        type="number"
                        placeholder="10"
                        value={amount[r.id] ?? ""}
                        onChange={(e) => setAmount((m) => ({ ...m, [r.id]: e.target.value }))}
                        className="h-8 w-20"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === r.id}
                        onClick={() => addCredits(r.id)}
                        className="gap-1.5"
                      >
                        <Plus className="h-3 w-3" /> Credits
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === r.id}
                        onClick={() => resetCredits(r.id)}
                        className="gap-1.5 border-accent/40 text-accent hover:bg-accent/10"
                        title="Reset this user's credits to 3"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset
                      </Button>
                      <Button
                        size="sm"
                        disabled={busy === r.id}
                        onClick={() => toggleStatus(r.id, r.status)}
                        className={
                          r.status === "premium"
                            ? "bg-muted text-muted-foreground hover:bg-muted/80"
                            : "bg-primary text-primary-foreground glow-pink hover:brightness-110"
                        }
                      >
                        {r.status === "premium" ? "Revert to Free" : "Make Premium"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No users yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </SiteShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: "pink" | "cyan";
}) {
  const ring = accent === "pink" ? "text-primary" : "text-accent";
  return (
    <div className="bento-tile p-5">
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl border border-border/60 bg-background/60 ${ring}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </div>
    </div>
  );
}