import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { streamImage } from "@/lib/streamImage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download, Sparkles, Youtube, Zap, Wand2 } from "lucide-react";
import { PromptChatSidebar } from "@/components/PromptChatSidebar";
import { AppNavDrawer } from "@/components/AppNavDrawer";
import { SiteShell } from "@/components/SiteShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Thumbly — AI YouTube & TikTok Thumbnail Generator" },
      {
        name: "description",
        content:
          "Generate eye-catching YouTube and TikTok thumbnails from a single text prompt with AI.",
      },
      { property: "og:title", content: "Thumbly — AI Thumbnail Generator" },
      {
        property: "og:description",
        content:
          "Generate eye-catching YouTube and TikTok thumbnails from a single text prompt with AI.",
      },
    ],
  }),
  component: Index,
});

type Platform = "youtube" | "tiktok";
type Result = { src: string | null; final: boolean; error: string | null; loading: boolean };

const EMPTY: Result = { src: null, final: false, error: null, loading: false };

const SAMPLES = [
  "A gamer reacting to a giant glowing dragon, neon arcade vibes, 'EPIC WIN' text",
  "Chef plating ramen in slow-mo, dramatic steam, 'I tried 100 noodles' caption",
  "MrBeast-style face holding stack of cash, explosion background, '$1,000,000?'",
  "Cyberpunk skater jumping over a hovercar at night, Tokyo neon signs",
];

function Index() {
  const [prompt, setPrompt] = useState("");
  const [yt, setYt] = useState<Result>(EMPTY);
  const [tt, setTt] = useState<Result>(EMPTY);

  const busy = yt.loading || tt.loading;

  async function generate() {
    const p = prompt.trim();
    if (!p || busy) return;
    setYt({ src: null, final: false, error: null, loading: true });
    setTt({ src: null, final: false, error: null, loading: true });

    const run = async (
      platform: Platform,
      set: (r: Result) => void,
    ) => {
      try {
        await streamImage(
          "/api/generate-image",
          { prompt: p, kind: "thumbnail", variant: platform },
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

    await Promise.all([run("youtube", setYt), run("tiktok", setTt)]);
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
      action={<PromptChatSidebar onUsePrompt={(p) => setPrompt(p)} />}
    >
      <header className="relative mb-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          <Zap className="h-3 w-3" />
          AI Thumbnail Engine
        </div>
        <h1 className="mt-6 text-balance text-5xl font-bold leading-[0.95] sm:text-7xl">
          Make people <span className="text-gradient-pink-cyan">click</span>.
          <br />
          <span className="text-foreground/70">In one prompt.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
          Type the vibe. Get a YouTube 16:9 and a TikTok 9:16 thumbnail —
          rendered live, ready to download.
        </p>
      </header>

      <div className="relative">
        <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-r from-[oklch(0.7_0.28_350)] via-[oklch(0.6_0.25_295)] to-[oklch(0.86_0.18_190)] opacity-60 blur-md" />
        <div className="glass-panel relative rounded-3xl p-2">
          <div className="rounded-2xl bg-background/70 p-5">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the scene, the energy, the on-image text..."
              className="min-h-32 resize-none border-0 bg-transparent p-0 text-base text-foreground shadow-none focus-visible:ring-0"
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
                className="group relative h-11 overflow-hidden bg-primary text-primary-foreground glow-pink hover:brightness-110"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Conjuring...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Generate thumbnails
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
            className="rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs text-muted-foreground transition hover:border-accent/60 hover:text-accent"
          >
            {s.length > 48 ? s.slice(0, 46) + "…" : s}
          </button>
        ))}
      </div>

      <section className="mt-14 grid gap-6 md:grid-cols-2">
        <ResultCard
          title="YouTube"
          subtitle="1280 × 720 · 16:9"
          aspect="aspect-video"
          accent="pink"
          Icon={Youtube}
          result={yt}
          onDownload={(src) => download(src, "youtube-thumbnail.png")}
        />
        <ResultCard
          title="TikTok"
          subtitle="1080 × 1920 · 9:16"
          aspect="aspect-[9/16]"
          accent="cyan"
          Icon={Zap}
          result={tt}
          onDownload={(src) => download(src, "tiktok-thumbnail.png")}
        />
      </section>
    </SiteShell>
  );
}

function ResultCard({
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
    <div className="glass-panel group relative rounded-3xl p-5 transition-all hover:-translate-y-0.5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`grid h-9 w-9 place-items-center rounded-xl border border-border/60 bg-background/60 ${ring}`}>
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
            className="gap-1.5 border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 hover:text-accent"
          >
            <Download className="h-3.5 w-3.5" /> PNG
          </Button>
        )}
      </div>
      <div
        className={`relative ${aspect} overflow-hidden rounded-2xl border border-border/60 bg-background/60 ${title === "TikTok" ? "mx-auto max-w-xs" : ""} ${result.final ? glow : ""}`}
      >
        {result.src ? (
          <img
            src={result.src}
            alt={`${title} thumbnail preview`}
            className={`h-full w-full object-cover transition-[filter] duration-500 ${
              result.final ? "blur-0" : "blur-2xl"
            }`}
          />
        ) : (
          <>
            <div className="bg-grid absolute inset-0 opacity-40" />
            <div className="relative flex h-full w-full items-center justify-center text-sm">
              {result.loading ? (
                <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-accent">
                  <Loader2 className="h-4 w-4 animate-spin" /> Rendering
                </span>
              ) : result.error ? (
                <span className="px-4 text-center text-destructive">{result.error}</span>
              ) : (
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Awaiting prompt
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
