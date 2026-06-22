import { useEffect, useRef, useState } from "react";
import { streamImage } from "@/lib/streamImage";
import { functionUrl, functionHeaders } from "@/lib/apiEndpoint";
import { animateImageToVideo, type AnimateStyle } from "@/lib/animateImageToVideo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppNavDrawer } from "@/components/AppNavDrawer";
import { SiteShell } from "@/components/SiteShell";
import { usePageMeta } from "@/lib/usePageMeta";
import { Loader2, Download, Sparkles, Film, Upload, Image as ImageIcon } from "lucide-react";

const STYLES: { id: AnimateStyle; label: string; hint: string }[] = [
  { id: "kenburns", label: "Cinematic", hint: "Smooth zoom + pan" },
  { id: "pulse", label: "Hype Pulse", hint: "Beat-style pulse" },
  { id: "glitch", label: "Glitch", hint: "RGB-split chaos" },
];

export default function VideoPage() {
  usePageMeta({
    title: "AI Video Generator — Thumbly",
    description:
      "Turn a prompt or thumbnail into a free 15-second cinematic animated gaming clip — no API keys required.",
  });

  const [prompt, setPrompt] = useState("");
  const [caption, setCaption] = useState("");
  const [style, setStyle] = useState<AnimateStyle>("kenburns");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [vidLoading, setVidLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [vidError, setVidError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  async function generateThumbnail() {
    const p = prompt.trim();
    if (!p || imgLoading) return;
    setImgError(null);
    setImgLoading(true);
    setImageSrc(null);
    try {
      await streamImage(
        functionUrl("generate-image"),
        { prompt: p, kind: "thumbnail", variant: "youtube" },
        (src, isFinal) => {
          setImageSrc(src);
          if (isFinal) setImgLoading(false);
        },
        { headers: functionHeaders },
      );
    } catch (e) {
      setImgError(e instanceof Error ? e.message : "Generation failed");
      setImgLoading(false);
    }
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(String(reader.result));
    reader.readAsDataURL(f);
  }

  async function generateVideo() {
    if (!imageSrc || vidLoading) return;
    setVidError(null);
    setVidLoading(true);
    setProgress(0);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    try {
      const blob = await animateImageToVideo(imageSrc, {
        durationMs: 15000,
        fps: 30,
        width: 1280,
        height: 720,
        style,
        caption,
        onProgress: setProgress,
      });
      setVideoUrl(URL.createObjectURL(blob));
    } catch (e) {
      setVidError(e instanceof Error ? e.message : "Video render failed");
    } finally {
      setVidLoading(false);
    }
  }

  return (
    <SiteShell nav={<AppNavDrawer />}>
      <section className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
          <Film className="h-3 w-3" /> AI Video Generator · free
        </div>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Turn a thumbnail into a <span className="text-gradient-pink-cyan">15-second cinematic clip</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Generate a thumbnail (or upload one), pick a motion style, and we'll render a short animated gaming clip
          right in your browser. 100% free — no API keys, no servers.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT: Source */}
        <div className="rounded-3xl border border-border/60 bg-card/40 p-5 backdrop-blur">
          <h2 className="mb-3 font-display text-lg font-semibold">1 · Choose a source image</h2>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Pro gamer with neon headset, explosion behind, 'INSANE WIN' caption"
            rows={3}
            className="bg-background/60"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={generateThumbnail} disabled={!prompt.trim() || imgLoading} className="gap-2">
              {imgLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Thumbnail
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" /> Upload Image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onUpload}
            />
          </div>
          {imgError && <p className="mt-3 text-sm text-destructive">{imgError}</p>}
          <div className="mt-4 aspect-video overflow-hidden rounded-2xl border border-border/60 bg-background/40">
            {imageSrc ? (
              <img src={imageSrc} alt="source" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2 text-xs">
                  <ImageIcon className="h-6 w-6" />
                  No image yet
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Video */}
        <div className="rounded-3xl border border-border/60 bg-card/40 p-5 backdrop-blur">
          <h2 className="mb-3 font-display text-lg font-semibold">2 · Animate it</h2>

          <div className="mb-3 grid grid-cols-3 gap-2">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                  style === s.id
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border/60 bg-background/40 hover:border-accent/50"
                }`}
              >
                <div className="font-semibold">{s.label}</div>
                <div className="text-[10px] text-muted-foreground">{s.hint}</div>
              </button>
            ))}
          </div>

          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Optional on-screen caption (e.g. INSANE WIN)"
            rows={2}
            className="bg-background/60"
          />

          <Button
            onClick={generateVideo}
            disabled={!imageSrc || vidLoading}
            className="mt-3 w-full gap-2"
            size="lg"
          >
            {vidLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
            {vidLoading ? `Rendering · ${Math.round(progress * 100)}%` : "Generate Video"}
          </Button>

          {vidError && <p className="mt-3 text-sm text-destructive">{vidError}</p>}

          <div className="mt-4 aspect-video overflow-hidden rounded-2xl border border-border/60 bg-background/40">
            {videoUrl ? (
              <video src={videoUrl} controls autoPlay loop className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2 text-xs">
                  <Film className="h-6 w-6" />
                  Your 15-second cinematic clip will appear here
                </div>
              </div>
            )}
          </div>

          {videoUrl && (
            <a
              href={videoUrl}
              download="thumbly-clip.webm"
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
            >
              <Download className="h-4 w-4" /> Download .webm
            </a>
          )}
        </div>
      </div>
    </SiteShell>
  );
}