import type { VercelRequest, VercelResponse } from "@vercel/node";

type Kind = "thumbnail" | "logo";
type Variant = "youtube" | "tiktok" | "square" | "wide";

const SPECS: Record<Kind, Record<string, { size: string; hint: string }>> = {
  thumbnail: {
    youtube: {
      size: "1536x1024",
      hint: "Horizontal 16:9 YouTube thumbnail, bold readable composition, high contrast, click-worthy",
    },
    tiktok: {
      size: "1024x1536",
      hint: "Vertical 9:16 TikTok thumbnail, bold mobile-first composition, eye-catching, vibrant",
    },
  },
  logo: {
    square: {
      size: "1024x1024",
      hint: "Modern, minimal app logo, centered icon mark on a clean background, crisp vector-like shapes, balanced negative space, scalable, professional brand identity",
    },
    wide: {
      size: "1536x1024",
      hint: "Horizontal brand wordmark logo, clean typography paired with a simple icon, generous padding, professional brand identity, suitable for website header",
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  const { prompt, kind, variant } = (req.body ?? {}) as {
    prompt: string;
    kind: Kind;
    variant: Variant;
  };
  if (!prompt?.trim()) {
    res.status(400).send("Missing prompt");
    return;
  }
  const spec = SPECS[kind]?.[variant];
  if (!spec) {
    res.status(400).send("Invalid kind/variant");
    return;
  }

  const [width, height] = spec.size.split("x").map(Number);
  const fullPrompt = `${spec.hint}. ${prompt}`;
  const seed = Math.floor(Math.random() * 1_000_000);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}` +
    `?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux&referrer=lovable`;

  const upstream = await fetch(url);
  if (!upstream.ok) {
    res.status(upstream.status).send(await upstream.text().catch(() => "Pollinations error"));
    return;
  }
  const buf = Buffer.from(await upstream.arrayBuffer());
  const b64 = buf.toString("base64");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.write(
    `event: image_generation.completed\ndata: ${JSON.stringify({
      type: "image_generation.completed",
      b64_json: b64,
    })}\n\n`,
  );
  res.end();
}