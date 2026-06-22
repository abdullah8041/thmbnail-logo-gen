// Client-side image -> 4s animated video using Canvas + MediaRecorder.
// No external API, fully free.

export type AnimateStyle = "kenburns" | "pulse" | "glitch";

export type AnimateOptions = {
  durationMs?: number;
  fps?: number;
  width?: number;
  height?: number;
  style?: AnimateStyle;
  caption?: string;
  onProgress?: (p: number) => void;
};

export async function animateImageToVideo(
  imageSrc: string,
  opts: AnimateOptions = {},
): Promise<Blob> {
  const durationMs = opts.durationMs ?? 4000;
  const fps = opts.fps ?? 30;
  const width = opts.width ?? 1280;
  const height = opts.height ?? 720;
  const style = opts.style ?? "kenburns";
  const caption = opts.caption?.trim() || "";

  const img = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const stream = (canvas as HTMLCanvasElement).captureStream(fps);
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 5_000_000 } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();

  const totalFrames = Math.round((durationMs / 1000) * fps);
  const frameInterval = 1000 / fps;
  const start = performance.now();

  for (let i = 0; i < totalFrames; i++) {
    const t = i / (totalFrames - 1); // 0..1
    drawFrame(ctx, img, width, height, t, style, caption);
    opts.onProgress?.(t);
    const target = start + (i + 1) * frameInterval;
    const wait = target - performance.now();
    if (wait > 0) await sleep(wait);
  }

  // Hold a final flush frame
  await sleep(80);
  recorder.stop();
  await stopped;

  return new Blob(chunks, { type: mimeType || "video/webm" });
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  t: number,
  style: AnimateStyle,
  caption: string,
) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  // Cover-fit base
  const ir = img.width / img.height;
  const cr = w / h;
  let baseW: number, baseH: number;
  if (ir > cr) {
    baseH = h;
    baseW = h * ir;
  } else {
    baseW = w;
    baseH = w / ir;
  }

  let zoom = 1;
  let dx = 0;
  let dy = 0;

  if (style === "kenburns") {
    zoom = 1.05 + t * 0.22; // slow zoom-in
    dx = (t - 0.5) * 60; // gentle pan
    dy = (0.5 - t) * 30;
  } else if (style === "pulse") {
    zoom = 1.08 + Math.sin(t * Math.PI * 2) * 0.04;
  } else if (style === "glitch") {
    zoom = 1.12 + Math.sin(t * Math.PI * 4) * 0.02;
    dx = (Math.random() - 0.5) * 6;
    dy = (Math.random() - 0.5) * 6;
  }

  const dw = baseW * zoom;
  const dh = baseH * zoom;
  const cx = (w - dw) / 2 + dx;
  const cy = (h - dh) / 2 + dy;

  if (style === "glitch" && Math.random() < 0.18) {
    // RGB split
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.6;
    ctx.drawImage(img, cx - 6, cy, dw, dh);
    ctx.drawImage(img, cx + 6, cy, dw, dh);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.drawImage(img, cx, cy, dw, dh);

  // Vignette
  const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Scanlines for gaming vibe
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#000";
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  ctx.globalAlpha = 1;

  // Intro fade
  const fadeIn = Math.min(1, t / 0.08);
  const fadeOut = Math.min(1, (1 - t) / 0.08);
  const fade = Math.min(fadeIn, fadeOut);
  if (fade < 1) {
    ctx.fillStyle = `rgba(0,0,0,${1 - fade})`;
    ctx.fillRect(0, 0, w, h);
  }

  // Caption
  if (caption) {
    const slide = Math.min(1, t / 0.25);
    const y = h - 70 + (1 - slide) * 40;
    const alpha = slide;
    ctx.font = `700 ${Math.round(h * 0.07)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = Math.round(h * 0.012);
    ctx.strokeStyle = `rgba(0,0,0,${0.85 * alpha})`;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.strokeText(caption.toUpperCase(), w / 2, y);
    ctx.fillText(caption.toUpperCase(), w / 2, y);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function pickMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}