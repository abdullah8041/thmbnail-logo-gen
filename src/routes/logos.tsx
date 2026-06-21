import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { streamImage } from "@/lib/streamImage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Download,
  Sparkles,
  Shapes,
  Square,
  RectangleHorizontal,
  Wand2,
} from "lucide-react";
import { AppNavDrawer } from "@/components/AppNavDrawer";
import { PromptChatSidebar } from "@/components/PromptChatSidebar";
import { SiteShell } from "@/components/SiteShell";

export const Route = createFileRoute("/logos")({
  head: () => ({
    meta: [
      { title: "Thumbly — AI Logo Generator" },
      {
        name: "description",
        content:
          "Generate clean, modern brand logos from a single text prompt with AI.",
      },
      { property: "og:title", content: "Thumbly — AI Logo Generator" },
      {
        property: "og:description",
        content:
          "Generate clean, modern brand logos from a single text prompt with AI.",
      },
    ],
  }),
  component: Logos,
});

type Variant = "square" | "wide";
type Result = {
  src: string | null;
  final: boolean;
  error: string | null;
  loading: boolean;
};
const EMPTY: Result = { src: null, final: false, error: null, loading: false };

const SAMPLES = [
  "Verdant — sustainable coffee, earthy greens, modern serif wordmark",
  "Nimbus, a fintech app, geometric cloud mark, deep blue + electric mint",
  "Pulse Studio, music label, abstract waveform glyph, monochrome",
  "Atlas Outdoors, hiking gear, vintage badge, mountain + sun",
];

function Logos() {
  const [prompt, setPrompt] = useState("");
  const [sq, setSq] = useState<Result>(EMPTY);
  const [wide, setWide] = useState<Result>(EMPTY);
  const busy = sq.loading || wide.loading;

  async function generate() {
    const p = prompt.trim();
    if (!p || busy) return;
    setSq({ ...EMPTY, loading: true });
    setWide({ ...EMPTY, loading: true });

    const run = async (variant: Variant, set: (r: Result) => void) => {
      try {
        await streamImage(
          "/api/generate-image",
          { prompt: p, kind: "logo", variant },
          (src, isFinal) =>
            set({ src, final: isFinal, error: null, loading: !isFinal }),
        );
      } catch (e) {
        set({
          src: null,
          final: false,
          loading: false,
          error: e instanceof Error ? e.message : "Generation failed",
        });
      }
    };

    await Promise.all([run("square", setSq), run("wide", setWide)]);
  }

  function download(src: string, name: string) {
    const a = document.createElement("a");
    a.href = src;
    a.download = name;
    a.click();
  }

  return (
    <SiteShell
      nav={<AppNavDrawer />}
      action={
        <PromptChatSidebar kind="logo" onUsePrompt={(p) => setPrompt(p)} />
      }
    >
      <header className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
          <Shapes className="h-3 w-3" />
          AI Logo Forge
        </div>
        <h1 className="mt-6 text-balance text-5xl font-bold leading-[0.95] sm:text-7xl">
          A <span className="text-gradient-pink-cyan">brand mark</span>
          <br />
          <span className="text-foreground/70">in seconds.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
          Describe the brand. Get a square symbol and a wide wordmark — two
          ready-to-use logo concepts, side by side.
        </p>
      </header>

      <div className="relative">
        <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-r from-[oklch(0.86_0.18_190)] via-[oklch(0.6_0.25_295)] to-[oklch(0.7_0.28_350)] opacity-60 blur-md" />
        <div className="glass-panel relative rounded-3xl p-2">
          <div className="rounded-2xl bg-background/70 p-5">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Brand name, what it does, vibe, colors, style..."
              className="min-h-32 resize-none border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
              }}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                ⌘/Ctrl + ↵ to generate
              </span>
              <Button
                onClick={generate}
                disabled={busy || !prompt.trim()}
                size="lg"
                className="h-11 bg-accent text-accent-foreground glow-cyan hover:brightness-110"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Forging...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Generate logos
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          <Wand2 className="mr-1 inline h-3 w-3" /> Try
        </span>
        {SAMPLES.map((s) => (
          <button
            key={s}
            onClick={() => setPrompt(s)}
            className="rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/60 hover:text-primary"
          >
            {s.length > 48 ? s.slice(0, 46) + "…" : s}
          </button>
        ))}
      </div>

      <section className="mt-14 grid gap-6 md:grid-cols-2">
        <LogoCard
          title="Square Mark"
          subtitle="1024 × 1024 · 1:1"
          aspect="aspect-square"
          accent="cyan"
          Icon={Square}
          result={sq}
          onDownload={(src) => download(src, "logo-square.png")}
        />
        <LogoCard
          title="Wide Wordmark"
          subtitle="1536 × 1024 · 3:2"
          aspect="aspect-[3/2]"
          accent="pink"
          Icon={RectangleHorizontal}
          result={wide}
          onDownload={(src) => download(src, "logo-wide.png")}
        />
      </section>
    </SiteShell>
  );
}

function LogoCard({
  title,
  subtitle,
  aspect,
  accent,
  Icon,
  result,
  onDownload,
}: {
  title: string;
  subtitle: string;
  aspect: string;
  accent: "pink" | "cyan";
  Icon: React.ComponentType<{ className?: string }>;
  result: Result;
  onDownload: (src: string) => void;
}) {
  const glow = accent === "pink" ? "glow-pink" : "glow-cyan";
  const ring = accent === "pink" ? "text-primary" : "text-accent";
  return (
    <div className="glass-panel relative rounded-3xl p-5 transition-all hover:-translate-y-0.5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`grid h-9 w-9 place-items-center rounded-xl border border-border/60 bg-background/60 ${ring}`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold leading-none">{title}</h2>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>
        {result.src && result.final && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownload(result.src!)}
            className="gap-1.5 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
          >
            <Download className="h-3.5 w-3.5" /> PNG
          </Button>
        )}
      </div>
      <div
        className={`relative ${aspect} overflow-hidden rounded-2xl border border-border/60 bg-background/60 ${result.final ? glow : ""}`}
      >
        {result.src ? (
          <img
            src={result.src}
            alt={`${title} preview`}
            className={`h-full w-full object-contain transition-[filter] duration-500 ${
              result.final ? "blur-0" : "blur-2xl"
            }`}
          />
        ) : (
          <>
            <div className="bg-grid absolute inset-0 opacity-40" />
            <div className="relative flex h-full w-full items-center justify-center">
              {result.loading ? (
                <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-accent">
                  <Loader2 className="h-4 w-4 animate-spin" /> Forging
                </span>
              ) : result.error ? (
                <span className="px-4 text-center text-sm text-destructive">
                  {result.error}
                </span>
              ) : (
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Awaiting brand brief
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
