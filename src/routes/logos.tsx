import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { streamImage } from "@/lib/streamImage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download, Sparkles, Shapes } from "lucide-react";
import { AppNavDrawer } from "@/components/AppNavDrawer";

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
type Result = { src: string | null; final: boolean; error: string | null; loading: boolean };
const EMPTY: Result = { src: null, final: false, error: null, loading: false };

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
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-6 flex items-center justify-between">
          <AppNavDrawer />
        </div>
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            <Shapes className="h-3.5 w-3.5" />
            AI-powered logos
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Logo Generator
          </h1>
          <p className="mt-3 text-muted-foreground">
            Describe your brand. Get a square mark and a horizontal wordmark instantly.
          </p>
        </header>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. A sustainable coffee brand called 'Verdant', earthy greens, modern serif"
            className="min-h-28 resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
            }}
          />
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-xs text-muted-foreground">
              ⌘/Ctrl + Enter to generate
            </span>
            <Button onClick={generate} disabled={busy || !prompt.trim()}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate
                </>
              )}
            </Button>
          </div>
        </div>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <LogoCard
            title="Square Mark"
            subtitle="1024 × 1024 · 1:1"
            aspect="aspect-square"
            result={sq}
            onDownload={(src) => download(src, "logo-square.png")}
          />
          <LogoCard
            title="Wide Wordmark"
            subtitle="1536 × 1024 · 3:2"
            aspect="aspect-[3/2]"
            result={wide}
            onDownload={(src) => download(src, "logo-wide.png")}
          />
        </section>
      </div>
    </div>
  );
}

function LogoCard({
  title,
  subtitle,
  aspect,
  result,
  onDownload,
}: {
  title: string;
  subtitle: string;
  aspect: string;
  result: Result;
  onDownload: (src: string) => void;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {result.src && result.final && (
          <Button size="sm" variant="outline" onClick={() => onDownload(result.src!)}>
            <Download className="h-4 w-4" /> PNG
          </Button>
        )}
      </div>
      <div className={`relative ${aspect} overflow-hidden rounded-xl bg-muted`}>
        {result.src ? (
          <img
            src={result.src}
            alt={`${title} preview`}
            className={`h-full w-full object-contain transition-[filter] duration-300 ${
              result.final ? "blur-0" : "blur-2xl"
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            {result.loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Rendering...
              </span>
            ) : result.error ? (
              <span className="px-4 text-center text-destructive">{result.error}</span>
            ) : (
              <span>Your {title.toLowerCase()} will appear here</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}