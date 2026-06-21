import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/generate-thumbnail")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt, platform } = (await request.json()) as {
          prompt: string;
          platform: "youtube" | "tiktok";
        };
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        if (!prompt?.trim()) return new Response("Missing prompt", { status: 400 });

        const size = platform === "tiktok" ? "1024x1536" : "1536x1024";
        const styleHint =
          platform === "tiktok"
            ? "Vertical 9:16 TikTok thumbnail, bold mobile-first composition, eye-catching, vibrant"
            : "Horizontal 16:9 YouTube thumbnail, bold readable composition, high contrast, click-worthy";

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
              prompt: `${styleHint}. ${prompt}`,
              size,
              quality: "low",
              n: 1,
              stream: true,
              partial_images: 2,
            }),
          },
        );

        if (!upstream.ok || !upstream.body) {
          return new Response(await upstream.text(), { status: upstream.status });
        }
        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});