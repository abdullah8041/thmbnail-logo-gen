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
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    res.status(500).send("Missing LOVABLE_API_KEY");
    return;
  }
  if (!prompt?.trim()) {
    res.status(400).send("Missing prompt");
    return;
  }
  const spec = SPECS[kind]?.[variant];
  if (!spec) {
    res.status(400).send("Invalid kind/variant");
    return;
  }

  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-image-2",
      prompt: `${spec.hint}. ${prompt}`,
      size: spec.size,
      quality: "low",
      n: 1,
      stream: true,
      partial_images: 2,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    res.status(upstream.status).send(await upstream.text());
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const reader = upstream.body.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}