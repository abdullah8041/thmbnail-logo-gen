import { useState } from "react";
import { streamImage } from "@/lib/streamImage";
import { functionUrl, functionHeaders } from "@/lib/apiEndpoint";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Download,
  Sparkles,
  Youtube,
  Zap,
  Wand2,
  Music2,
  Activity,
  Command,
} from "lucide-react";
import { PromptChatSidebar } from "@/components/PromptChatSidebar";
import { AppNavDrawer } from "@/components/AppNavDrawer";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { SiteShell } from "@/components/SiteShell";
import { usePageMeta } from "@/lib/usePageMeta";
import { useAuth } from "@/lib/auth";
import { saveGeneration, type HistoryItem } from "@/lib/history";

type Platform = "youtube" | "tiktok";
type Result = { src: string | null; final: boolean; error: string | null; loading: boolean };

const EMPTY: Result = { src: null, final: false, error: null, loading: false };

const SAMPLES = [
  { tag: "Gaming", text: "A gamer reacting to a giant glowing dragon, neon arcade vibes, 'EPIC WIN' text" },
  { tag: "Food", text: "Chef plating ramen in slow-mo, dramatic steam, 'I tried 100 noodles' caption" },
  { tag: "Money", text: "MrBeast-style face holding stack of cash, explosion background, '$1,000,000?'" },
  { tag: "Vlog", text: "Cyberpunk skater jumping over a hovercar at night, Tokyo neon signs" },
];

export default function IndexPage() {
  usePageMeta({
    title: "ProFX.ai | Premium AI Thumbnail & Logo Generator for Gamers",
    description:
      "Create high-quality, high-CTR gaming thumbnails and esports logos instantly with ProFX.ai. Powered by advanced AI to give your YouTube and TikTok channels a professional edge.",
  });
  const [prompt, setPrompt] = useState("");
  const [yt, setYt] = useState<Result>(EMPTY);
  const [tt, setTt] = useState<Result>(EMPTY);
  const { consumeCredit } = useAuth();

  const busy = yt.loading || tt.loading;
  const status: "idle" | "rendering" | "ready" | "error" = busy
    ? "rendering"
    : yt.error || tt.error
      ? "error"
      : yt.final || tt.final
        ? "ready"
        : "idle";

  async function generate() {
    const p = prompt.trim();
    if (!p || busy) return;
    const ok = await consumeCredit();
    if (!ok) return;
    setYt({ src: null, final: false, error: null, loading: true });
    setTt({ src: null, final: false, error: null, loading: true });

    const run = async (
      platform: Platform,
      set: (r: Result) => void,
      kind: string,
    ) => {
      let lastSrc: string | null = null;
      try {
        await streamImage(
          functionUrl("generate-image"),
          { prompt: p, kind: "thumbnail", variant: platform },
          (src, isFinal) => {
            lastSrc = src;
            set({ src, final: isFinal, error: null, loading: !isFinal });
          },
          { headers: functionHeaders },
        );
        if (lastSrc) {
          await saveGeneration({ kind, prompt: p, image_url: lastSrc });
        }
      } catch (e) {
        set({
          src: null,
          final: false,
          loading: false,
          error: e instanceof Error ? e.message : "Generation failed",
        });
      }
    };

    await Promise.all([
      run("youtube", setYt, "thumbnail-youtube"),
      run("tiktok", setTt, "thumbnail-tiktok"),
    ]);
  }

  function download(src: string, name: string) {
    const a = document.createElement("a");
    a.href = src;
    a.download = name;
    a.click();
  }

  function openHistory(item: HistoryItem) {
    setPrompt(item.prompt);
    const result: Result = { src: item.image_url, final: true, error: null, loading: false };
    if (item.kind === "thumbnail-youtube") setYt(result);
    else if (item.kind === "thumbnail-tiktok") setTt(result);
  }

  return (
    <SiteShell
      nav={
        <div className="flex items-center gap-2">
          <AppNavDrawer />
          <HistoryDrawer
            kinds={["thumbnail-youtube", "thumbnail-tiktok"]}
            onOpen={openHistory}
          />
        </div>
      }
      action={<PromptChatSidebar onUsePrompt={(p) => setPrompt(p)} />}
    >
      <HeroLine status={status} />

      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-6 lg:grid-rows-[auto_auto_auto] lg:gap-5">
        <div className="bento-tile relative overflow-hidden p-6 lg:col-span-4 lg:row-span-2">
          <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[oklch(0.7_0.28_350/0.25)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-20 h-72 w-72 rounded-full bg-[oklch(0.86_0.18_190/0.18)] blur-3xl" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                <Command className="h-3 w-3" /> Composer
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {prompt.length}/600
              </span>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 600))}
              placeholder="Describe the scene, the energy, the on-image text…"
              className="mt-4 min-h-40 flex-1 resize-none border-0 bg-transparent p-0 text-lg leading-relaxed text-foreground shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
              }}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                ⌘/Ctrl + ↵
              </span>
              <Button
                onClick={generate}
                disabled={busy || !prompt.trim()}
                size="lg"
                className="group relative h-11 overflow-hidden bg-primary text-primary-foreground glow-pink hover:brightness-110"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Conjuring…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 lg:row-span-3">
          <ResultCard
            title="TikTok"
            subtitle="1080 × 1920 · 9:16"
            aspect="aspect-[9/16]"
            accent="cyan"
            Icon={Music2}
            result={tt}
            onDownload={(src) => download(src, "tiktok-thumbnail.png")}
            tall
          />
        </div>

        <StatusTile status={status} />

        <div className="bento-tile bento-tile-hover p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Wand2 className="h-3.5 w-3.5 text-accent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Spark ideas
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLES.map((s) => (
              <button
                key={s.tag}
                onClick={() => setPrompt(s.text)}
                className="group rounded-lg border border-border/40 bg-background/40 px-2.5 py-1.5 text-left transition hover:border-accent/60 hover:bg-accent/5"
              >
                <span className="block font-mono text-[10px] uppercase tracking-wider text-accent/80 group-hover:text-accent">
                  {s.tag}
                </span>
                <span className="line-clamp-1 text-xs text-muted-foreground group-hover:text-foreground">
                  {s.text}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4">
          <ResultCard
            title="YouTube"
            subtitle="1280 × 720 · 16:9"
            aspect="aspect-video"
            accent="pink"
            Icon={Youtube}
            result={yt}
            onDownload={(src) => download(src, "youtube-thumbnail.png")}
          />
        </div>
      </section>
    </SiteShell>
  );
}

function HeroLine({ status }: { status: "idle" | "rendering" | "ready" | "error" }) {
  const dot =
    status === "rendering"
      ? "bg-primary"
      : status === "ready"
        ? "bg-accent"
        : status === "error"
          ? "bg-destructive"
          : "bg-muted-foreground/60";
  const label =
    status === "rendering"
      ? "Rendering live"
      : status === "ready"
        ? "Ready to download"
        : status === "error"
          ? "Generation error"
          : "Standing by";
  return (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          <Zap className="h-3 w-3" /> ProFX.ai Thumbnail Engine
        </div>
        <h1 className="mt-4 text-balance text-5xl font-bold leading-[0.95] sm:text-6xl">
          Premium AI thumbnails for <span class="text-gradient-pink-cyan">gamers</span>.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Create high-CTR gaming thumbnails and esports logos instantly. Give your YouTube and TikTok channels a professional edge.
        </p>
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/40 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className={`live-dot inline-block h-2 w-2 rounded-full ${dot}`} />
        {label}
      </div>
    </header>
  );
}

function StatusTile({ status }: { status: "idle" | "rendering" | "ready" | "error" }) {
  return (
    <div className="bento-tile bento-tile-hover relative overflow-hidden p-5 lg:col-span-2">
      <div className="scanline absolute inset-0 opacity-50" />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Pipeline
          </span>
        </div>
        <div className="space-y-1.5 font-mono text-[11px] uppercase tracking-wider">
          <Row label="Prompt" value={status === "idle" ? "—" : "ok"} ok={status !== "idle"} />
          <Row label="Model" value="gemini-flash" ok />
          <Row
            label="Stream"
            value={status === "rendering" ? "live" : status === "ready" ? "done" : status === "error" ? "fail" : "idle"}
            ok={status === "rendering" || status === "ready"}
            warn={status === "error"}
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, ok, warn }: { label: string; value: string; ok?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={warn ? "text-destructive" : ok ? "text-accent" : "text-muted-foreground/60"}>
        {value}
      </span>
    </div>
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
  tall,
}: {
  title: string;
  subtitle: string;
  aspect: string;
  accent: "pink" | "cyan";
  Icon: React.ComponentType<{ className?: string }>;
  result: Result;
  onDownload: (src: string) => void;
  tall?: boolean;
}) {
  const glow = accent === "pink" ? "glow-pink" : "glow-cyan";
  const ring = accent === "pink" ? "text-primary" : "text-accent";
  return (
    <div className={`bento-tile bento-tile-hover group relative flex ${tall ? "h-full" : ""} flex-col p-5`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={`grid h-9 w-9 place-items-center rounded-xl border border-border/60 bg-background/60 ${ring}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
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
            className="shrink-0 gap-1.5 border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 hover:text-accent"
          >
            <Download className="h-3.5 w-3.5" /> PNG
          </Button>
        )}
      </div>
      <div
        className={`relative ${aspect} ${tall ? "w-full flex-1" : ""} overflow-hidden rounded-2xl border border-border/60 bg-background/60 ${result.final ? glow : ""}`}
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
            {result.loading && (
              <div className="absolute inset-0 animate-shimmer" />
            )}
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