import { useState } from "react";
import { streamImage } from "@/lib/streamImage";
import { functionUrl, functionHeaders } from "@/lib/apiEndpoint";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Download,
  Sparkles,
  Shapes,
  Square,
  RectangleHorizontal,
  Command,
  Palette,
} from "lucide-react";
import { AppNavDrawer } from "@/components/AppNavDrawer";
import { PromptChatSidebar } from "@/components/PromptChatSidebar";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { SiteShell } from "@/components/SiteShell";
import { usePageMeta } from "@/lib/usePageMeta";
import { useAuth } from "@/lib/auth";
import { saveGeneration, type HistoryItem } from "@/lib/history";

type Variant = "square" | "wide";
type Result = {
  src: string | null;
  final: boolean;
  error: string | null;
  loading: boolean;
};
const EMPTY: Result = { src: null, final: false, error: null, loading: false };

const SAMPLES = [
  { tag: "Coffee", text: "Verdant — sustainable coffee, earthy greens, modern serif wordmark" },
  { tag: "Fintech", text: "Nimbus, a fintech app, geometric cloud mark, deep blue + electric mint" },
  { tag: "Music", text: "Pulse Studio, music label, abstract waveform glyph, monochrome" },
  { tag: "Outdoors", text: "Atlas Outdoors, hiking gear, vintage badge, mountain + sun" },
];

export default function LogosPage() {
  usePageMeta({
    title: "Thumbly — AI Logo Generator",
    description: "Generate clean, modern brand logos from a single text prompt with AI.",
  });
  const [prompt, setPrompt] = useState("");
  const [sq, setSq] = useState<Result>(EMPTY);
  const [wide, setWide] = useState<Result>(EMPTY);
  const busy = sq.loading || wide.loading;
  const { consumeCredit } = useAuth();

  async function generate() {
    const p = prompt.trim();
    if (!p || busy) return;
    const ok = await consumeCredit();
    if (!ok) return;
    setSq({ ...EMPTY, loading: true });
    setWide({ ...EMPTY, loading: true });

    const run = async (
      variant: Variant,
      set: (r: Result) => void,
      kind: string,
    ) => {
      let lastSrc: string | null = null;
      try {
        await streamImage(
          functionUrl("generate-image"),
          { prompt: p, kind: "logo", variant },
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
      run("square", setSq, "logo-square"),
      run("wide", setWide, "logo-wide"),
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
    if (item.kind === "logo-square") setSq(result);
    else if (item.kind === "logo-wide") setWide(result);
  }

  return (
    <SiteShell
      nav={
        <div className="flex items-center gap-2">
          <AppNavDrawer />
          <HistoryDrawer
            kinds={["logo-square", "logo-wide"]}
            onOpen={openHistory}
          />
        </div>
      }
      action={<PromptChatSidebar kind="logo" onUsePrompt={(p) => setPrompt(p)} />}
    >
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
            <Shapes className="h-3 w-3" /> Logo Forge
          </div>
          <h1 className="mt-4 text-balance text-5xl font-bold leading-[0.95] sm:text-6xl">
            A <span className="text-gradient-pink-cyan">brand mark</span>, in seconds.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            One brief → a square symbol and a wide wordmark, generated side by side.
          </p>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-6 lg:gap-5">
        <div className="bento-tile relative overflow-hidden p-6 lg:col-span-4 lg:row-span-2">
          <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[oklch(0.86_0.18_190/0.22)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[oklch(0.7_0.28_350/0.2)] blur-3xl" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                <Command className="h-3 w-3" /> Brief
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {prompt.length}/600
              </span>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 600))}
              placeholder="Brand name, what it does, vibe, colors, style…"
              className="mt-4 min-h-40 flex-1 resize-none border-0 bg-transparent p-0 text-lg leading-relaxed shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
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
                className="h-11 bg-accent text-accent-foreground glow-cyan hover:brightness-110"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Forging…
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

        <div className="lg:col-span-2 lg:row-span-2">
          <LogoCard
            title="Square Mark"
            subtitle="1024 · 1:1"
            aspect="aspect-square"
            accent="cyan"
            Icon={Square}
            result={sq}
            onDownload={(src) => download(src, "logo-square.png")}
            tall
          />
        </div>

        <div className="lg:col-span-4">
          <LogoCard
            title="Wide Wordmark"
            subtitle="1536 × 1024 · 3:2"
            aspect="aspect-[3/2]"
            accent="pink"
            Icon={RectangleHorizontal}
            result={wide}
            onDownload={(src) => download(src, "logo-wide.png")}
          />
        </div>

        <div className="bento-tile bento-tile-hover p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Palette className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Brief presets
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLES.map((s) => (
              <button
                key={s.tag}
                onClick={() => setPrompt(s.text)}
                className="group rounded-lg border border-border/40 bg-background/40 px-2.5 py-1.5 text-left transition hover:border-primary/60 hover:bg-primary/5"
              >
                <span className="block font-mono text-[10px] uppercase tracking-wider text-primary/80 group-hover:text-primary">
                  {s.tag}
                </span>
                <span className="line-clamp-1 text-xs text-muted-foreground group-hover:text-foreground">
                  {s.text}
                </span>
              </button>
            ))}
          </div>
        </div>
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
    <div className={`bento-tile bento-tile-hover relative flex ${tall ? "h-full" : ""} flex-col p-5`}>
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
            className="shrink-0 gap-1.5 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
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
            alt={`${title} preview`}
            className={`h-full w-full object-contain transition-[filter] duration-500 ${
              result.final ? "blur-0" : "blur-2xl"
            }`}
          />
        ) : (
          <>
            <div className="bg-grid absolute inset-0 opacity-40" />
            {result.loading && <div className="absolute inset-0 animate-shimmer" />}
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