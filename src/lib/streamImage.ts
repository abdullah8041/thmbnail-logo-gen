// Direct browser → OpenAI (DALL-E 3) or Lovable AI Gateway image generation.
// Key is loaded from localStorage via apiKey.ts.

import { requireKey } from "./apiKey";

type Kind = "thumbnail" | "logo";
type Variant = "youtube" | "tiktok" | "square" | "wide";

type Spec = {
  size: "1024x1024" | "1792x1024" | "1024x1792";
  hint: string;
};

const SPECS: Record<Kind, Record<Variant, Spec | undefined>> = {
  thumbnail: {
    youtube: {
      size: "1792x1024",
      hint: "Horizontal 16:9 YouTube thumbnail, bold readable composition, high contrast, click-worthy",
    },
    tiktok: {
      size: "1024x1792",
      hint: "Vertical 9:16 TikTok thumbnail, bold mobile-first composition, eye-catching, vibrant",
    },
    square: undefined,
    wide: undefined,
  },
  logo: {
    square: {
      size: "1024x1024",
      hint: "Modern minimal app logo, centered icon mark on a clean background, crisp vector-like shapes, balanced negative space, scalable, professional brand identity",
    },
    wide: {
      size: "1792x1024",
      hint: "Horizontal brand wordmark logo, clean typography paired with a simple icon, generous padding, professional brand identity, suitable for website header",
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

  const { key, provider } = requireKey();
  const fullPrompt = `${spec.hint}. ${body.prompt}`;

  const url =
    provider === "openai"
      ? "https://api.openai.com/v1/images/generations"
      : "https://ai.gateway.lovable.dev/v1/images/generations";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (provider === "openai") headers["Authorization"] = `Bearer ${key}`;
  else headers["Lovable-API-Key"] = key;

  const payload =
    provider === "openai"
      ? {
          model: "dall-e-3",
          prompt: fullPrompt,
          size: spec.size,
          n: 1,
          response_format: "b64_json",
          quality: "hd",
        }
      : {
          // Lovable AI Gateway exposes OpenAI-style image generations.
          model: "openai/dall-e-3",
          prompt: fullPrompt,
          size: spec.size,
          n: 1,
          response_format: "b64_json",
        };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(parseError(res.status, errText));
  }

  const json = await res.json();
  const item = json?.data?.[0];
  const b64 = item?.b64_json as string | undefined;
  const remoteUrl = item?.url as string | undefined;

  if (b64) {
    onFrame(`data:image/png;base64,${b64}`, true);
    return;
  }
  if (remoteUrl) {
    onFrame(remoteUrl, true);
    return;
  }
  throw new Error("Image response was empty");
}

function parseError(status: number, text: string): string {
  try {
    const j = JSON.parse(text);
    const msg = j?.error?.message || j?.message;
    if (msg) return `${status}: ${msg}`;
  } catch {
    /* ignore */
  }
  if (status === 401) return "401 Unauthorized — check your API key in Settings.";
  if (status === 429) return "429 Rate limit / quota exceeded — try again shortly.";
  return `Image generation failed (${status}). ${text.slice(0, 200)}`;
}
