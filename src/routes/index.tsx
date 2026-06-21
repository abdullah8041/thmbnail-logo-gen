import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { streamImage } from "@/lib/streamImage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download, Sparkles } from "lucide-react";

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
          "/api/generate-thumbnail",
          { prompt: p, platform },
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
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered thumbnails
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Thumbnail Generator
          </h1>
          <p className="mt-3 text-muted-foreground">
            Describe your video. Get a YouTube and a TikTok thumbnail instantly.
          </p>
        </header>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. A gamer reacting to a giant glowing dragon, neon arcade vibes, 'EPIC WIN' text"
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
          <ResultCard
            title="YouTube"
            subtitle="1280 × 720 · 16:9"
            aspect="aspect-video"
            result={yt}
            onDownload={(src) => download(src, "youtube-thumbnail.png")}
          />
          <ResultCard
            title="TikTok"
            subtitle="1080 × 1920 · 9:16"
            aspect="aspect-[9/16]"
            result={tt}
            onDownload={(src) => download(src, "tiktok-thumbnail.png")}
          />
        </section>
      </div>
    </div>
  );
}

function ResultCard({
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
      <div
        className={`relative ${aspect} overflow-hidden rounded-xl bg-muted ${title === "TikTok" ? "mx-auto max-w-xs" : ""}`}
      >
        {result.src ? (
          <img
            src={result.src}
            alt={`${title} thumbnail preview`}
            className={`h-full w-full object-cover transition-[filter] duration-300 ${
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
              <span>Your {title} thumbnail will appear here</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
