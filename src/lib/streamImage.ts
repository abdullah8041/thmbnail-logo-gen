// Free, no-key image generation via Pollinations AI.
// Called directly from the browser — no backend / API key required.

type Kind = "thumbnail" | "logo";
type Variant = "youtube" | "tiktok" | "square" | "wide";

type Spec = { width: number; height: number; hint: string };

const SPECS: Record<Kind, Record<Variant, Spec | undefined>> = {
  thumbnail: {
    youtube: {
      width: 1280,
      height: 720,
      hint: "Horizontal 16:9 YouTube thumbnail, bold readable composition, high contrast, click-worthy",
    },
    tiktok: {
      width: 720,
      height: 1280,
      hint: "Vertical 9:16 TikTok thumbnail, bold mobile-first composition, eye-catching, vibrant",
    },
    square: undefined,
    wide: undefined,
  },
  logo: {
    square: {
      width: 1024,
      height: 1024,
      hint: "Modern minimal app logo, centered icon mark on a clean background, crisp vector-like shapes, balanced negative space, scalable, professional brand identity",
    },
    wide: {
      width: 1280,
      height: 720,
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

  const fullPrompt = `${spec.hint}. ${body.prompt}`;
  const blob = await fetchWithFallback(fullPrompt, spec.width, spec.height);
  const dataUrl: string = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error ?? new Error("Failed to read image"));
    fr.readAsDataURL(blob);
  });
  onFrame(dataUrl, true);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildUrl(prompt: string, w: number, h: number, model: "flux" | "turbo") {
  const seed = Math.floor(Math.random() * 1_000_000);
  return (
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${w}&height=${h}&seed=${seed}&nologo=true&model=${model}&referrer=thumbly`
  );
}

async function tryFetch(
  prompt: string,
  w: number,
  h: number,
  model: "flux" | "turbo",
  maxRetries: number,
): Promise<Blob> {
  let lastStatus = 0;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(buildUrl(prompt, w, h, model));
      if (res.ok) return await res.blob();
      lastStatus = res.status;
      // Retry only on rate-limit / transient errors
      if (res.status !== 429 && res.status < 500) {
        throw new Error(`Image generation failed: ${res.status}`);
      }
    } catch (e) {
      if (attempt === maxRetries) throw e;
    }
    if (attempt < maxRetries) {
      // Exponential backoff with jitter: 1s, 2s, 4s ...
      const delay = 1000 * 2 ** attempt + Math.floor(Math.random() * 400);
      await sleep(delay);
    }
  }
  throw new Error(`Image generation failed: ${lastStatus || "unknown"}`);
}

async function fetchWithFallback(prompt: string, w: number, h: number): Promise<Blob> {
  try {
    return await tryFetch(prompt, w, h, "flux", 3);
  } catch (primaryErr) {
    // Fallback to Pollinations' lighter "turbo" model — different queue, often available
    // when flux is rate-limited.
    try {
      return await tryFetch(prompt, w, h, "turbo", 2);
    } catch {
      throw primaryErr instanceof Error
        ? primaryErr
        : new Error("Image generation failed");
    }
  }
}