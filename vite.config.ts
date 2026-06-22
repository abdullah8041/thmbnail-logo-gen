import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";

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

const REWRITE_SYSTEMS = {
  thumbnail: `You are a thumbnail prompt engineer. Rewrite the user's simple topic into ONE vivid, detailed image-generation prompt for a YouTube/TikTok thumbnail.

Rules:
- Output ONLY the final prompt text. No preamble, no explanations, no quotes, no markdown.
- 2-4 sentences, under 90 words.
- Include: subject + action, camera/composition, lighting, color palette, mood/style, and a short bold on-image text suggestion in quotes.
- Make it click-worthy, high-contrast, and visually specific.`,
  logo: `You are a brand identity prompt engineer. Rewrite the user's simple brand idea into ONE vivid, detailed image-generation prompt for a modern logo.

Rules:
- Output ONLY the final prompt text. No preamble, no explanations, no quotes, no markdown.
- 2-4 sentences, under 90 words.
- Include: brand name (in quotes if given), icon/symbol concept, typography style, color palette with hex or named colors, geometry/shape language, mood (minimal, playful, luxury, techy, etc.), and background treatment.
- Favor clean, scalable, vector-friendly designs. Avoid photographic detail.`,
} as const;

async function readJson(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function pipeUpstream(upstream: Response, res: ServerResponse) {
  if (!upstream.ok || !upstream.body) {
    res.statusCode = upstream.status;
    res.end(await upstream.text());
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

function devApiPlugin(): Plugin {
  return {
    name: "dev-api-routes",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url !== "/api/generate-image" && url !== "/api/rewrite-prompt") {
          return next();
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          res.statusCode = 500;
          res.end("Missing LOVABLE_API_KEY");
          return;
        }
        try {
          const body = await readJson(req);
          if (url === "/api/generate-image") {
            const { prompt, kind, variant } = body as {
              prompt: string;
              kind: Kind;
              variant: Variant;
            };
            if (!prompt?.trim()) {
              res.statusCode = 400;
              res.end("Missing prompt");
              return;
            }
            const spec = SPECS[kind]?.[variant];
            if (!spec) {
              res.statusCode = 400;
              res.end("Invalid kind/variant");
              return;
            }
            const upstream = await fetch(
              "https://ai.gateway.lovable.dev/v1/images/generations",
              {
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
              },
            );
            await pipeUpstream(upstream, res);
            return;
          }

          // /api/rewrite-prompt
          const { messages, kind } = body as {
            messages: { role: "user" | "assistant"; content: string }[];
            kind?: keyof typeof REWRITE_SYSTEMS;
          };
          const system =
            REWRITE_SYSTEMS[kind ?? "thumbnail"] ?? REWRITE_SYSTEMS.thumbnail;
          const upstream = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                stream: true,
                messages: [{ role: "system", content: system }, ...(messages ?? [])],
              }),
            },
          );
          await pipeUpstream(upstream, res);
        } catch (err) {
          res.statusCode = 500;
          res.end(err instanceof Error ? err.message : "Internal error");
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
  },
});