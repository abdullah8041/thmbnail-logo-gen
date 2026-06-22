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
  const seed = Math.floor(Math.random() * 1_000_000);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}` +
    `?width=${spec.width}&height=${spec.height}&seed=${seed}` +
    `&nologo=true&model=flux&referrer=thumbly`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Image generation failed: ${res.status}`);
  }
  const blob = await res.blob();
  const dataUrl: string = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error ?? new Error("Failed to read image"));
    fr.readAsDataURL(blob);
  });
  onFrame(dataUrl, true);
}