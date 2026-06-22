// Free image generation via Pollinations AI (no API key needed).
// If the user has set an OpenAI / Lovable key in Settings, we use that for HD
// DALL·E 3 — otherwise we fall back to Pollinations' flux model with `enhance`
// for the best free quality available.

import { getStoredKey } from "./apiKey";

type Kind = "thumbnail" | "logo";
type Variant = "youtube" | "tiktok" | "square" | "wide";

type Spec = {
  width: number;
  height: number;
  openaiSize: "1024x1024" | "1792x1024" | "1024x1792";
  hint: string;
};

const SPECS: Record<Kind, Record<Variant, Spec | undefined>> = {
  thumbnail: {
    youtube: {
      width: 1280,
      height: 720,
      openaiSize: "1792x1024",
      hint: "Horizontal 16:9 YouTube thumbnail, bold readable composition, high contrast, click-worthy, ultra detailed, 4k",
    },
    tiktok: {
      width: 720,
      height: 1280,
      openaiSize: "1024x1792",
      hint: "Vertical 9:16 TikTok thumbnail, bold mobile-first composition, eye-catching, vibrant, ultra detailed, 4k",
    },
    square: undefined,
    wide: undefined,
  },
  logo: {
    square: {
      width: 1024,
      height: 1024,
      openaiSize: "1024x1024",
      hint: "Modern minimal app logo, centered icon mark on clean background, crisp vector-like shapes, balanced negative space, scalable, professional brand identity, sharp, high quality",
    },
    wide: {
      width: 1280,
      height: 720,
      openaiSize: "1792x1024",
      hint: "Horizontal brand wordmark logo, clean typography with simple icon, generous padding, professional brand identity, sharp, high quality",
    },
    youtube: undefined,
    tiktok: undefined,
  },
};

type Body = { prompt: string; kind: Kind; variant: Variant };

export async function streamImage(
  _endpoint: string,
  body: Body,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
): Promise<void> {
  const spec = SPECS[body.kind]?.[body.variant];
  if (!spec) throw new Error(`Invalid kind/variant: ${body.kind}/${body.variant}`);

  const fullPrompt = `${spec.hint}. ${body.prompt}`;
  const stored = getStoredKey();

  // If user provided a key, use HD DALL·E 3.
  if (stored) {
    const dataUrl = await generateViaOpenAICompatible(
      stored.key,
      stored.provider,
      fullPrompt,
      spec.openaiSize,
    );
    onFrame(dataUrl, true);
    return;
  }

  // Otherwise fall back to free Pollinations (no key required).
  const blob = await fetchPollinations(fullPrompt, spec.width, spec.height);
  const dataUrl: string = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error ?? new Error("Failed to read image"));
    fr.readAsDataURL(blob);
  });
  onFrame(dataUrl, true);
}

// ---- OpenAI / Lovable Gateway path (HD) ----

async function generateViaOpenAICompatible(
  key: string,
  provider: "openai" | "lovable",
  prompt: string,
  size: "1024x1024" | "1792x1024" | "1024x1792",
): Promise<string> {
  const url =
    provider === "openai"
      ? "https://api.openai.com/v1/images/generations"
      : "https://ai.gateway.lovable.dev/v1/images/generations";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (provider === "openai") headers["Authorization"] = `Bearer ${key}`;
  else headers["Lovable-API-Key"] = key;

  const payload = {
    model: provider === "openai" ? "dall-e-3" : "openai/dall-e-3",
    prompt,
    size,
    n: 1,
    response_format: "b64_json",
    ...(provider === "openai" ? { quality: "hd" } : {}),
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(parseError(res.status, t));
  }
  const json = await res.json();
  const item = json?.data?.[0];
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (item?.url) return item.url as string;
  throw new Error("Image response was empty");
}

// ---- Pollinations free path ----

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildPollUrl(
  prompt: string,
  w: number,
  h: number,
  model: "flux" | "turbo",
) {
  const seed = Math.floor(Math.random() * 1_000_000);
  return (
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${w}&height=${h}&seed=${seed}&nologo=true&enhance=true&model=${model}&referrer=thumbly`
  );
}

async function tryPoll(
  prompt: string,
  w: number,
  h: number,
  model: "flux" | "turbo",
  maxRetries: number,
): Promise<Blob> {
  let lastStatus = 0;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(buildPollUrl(prompt, w, h, model));
      if (res.ok) return await res.blob();
      lastStatus = res.status;
      if (res.status !== 429 && res.status < 500) {
        throw new Error(`Image generation failed: ${res.status}`);
      }
    } catch (e) {
      if (attempt === maxRetries) throw e;
    }
    if (attempt < maxRetries) {
      await sleep(1000 * 2 ** attempt + Math.floor(Math.random() * 400));
    }
  }
  throw new Error(`Image generation failed: ${lastStatus || "unknown"}`);
}

async function fetchPollinations(prompt: string, w: number, h: number): Promise<Blob> {
  try {
    return await tryPoll(prompt, w, h, "flux", 3);
  } catch (err) {
    try {
      return await tryPoll(prompt, w, h, "turbo", 2);
    } catch {
      throw err instanceof Error ? err : new Error("Image generation failed");
    }
  }
}

function parseError(status: number, text: string): string {
  try {
    const j = JSON.parse(text);
    const msg = j?.error?.message || j?.message;
    if (msg) return `${status}: ${msg}`;
  } catch {
    /* ignore */
  }
  if (status === 401) return "401 Unauthorized — check the API key in Settings.";
  if (status === 429) return "429 Rate limit — try again shortly.";
  return `Image generation failed (${status}). ${text.slice(0, 200)}`;
}
