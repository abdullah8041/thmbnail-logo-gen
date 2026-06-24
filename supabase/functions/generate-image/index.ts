import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

type Kind = "thumbnail" | "logo";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  let body: { prompt?: string; kind?: Kind; variant?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }
  const { prompt, kind, variant } = body;
  if (!prompt?.trim()) {
    return new Response("Missing prompt", { status: 400, headers: corsHeaders });
  }
  const spec = kind && variant ? SPECS[kind]?.[variant] : undefined;
  if (!spec) {
    return new Response("Invalid kind/variant", { status: 400, headers: corsHeaders });
  }

  const [w, h] = spec.size.split("x").map((n) => parseInt(n, 10));
  const fullPrompt = `${spec.hint}. ${prompt}`;
  const seed = Math.floor(Math.random() * 1_000_000);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}` +
    `?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux`;

  let upstream: Response;
  try {
    upstream = await fetch(url, { headers: { Accept: "image/*" } });
  } catch (err) {
    return new Response(
      JSON.stringify({
        type: "upstream_error",
        message: `Failed to reach Pollinations: ${err instanceof Error ? err.message : String(err)}`,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({ type: "upstream_error", message: text || `Pollinations error ${upstream.status}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let b64 = "";
  try {
    const bytes = new Uint8Array(await upstream.arrayBuffer());
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    b64 = btoa(binary);
  } catch (err) {
    return new Response(
      JSON.stringify({
        type: "upstream_error",
        message: `Failed to decode image: ${err instanceof Error ? err.message : String(err)}`,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const sse =
    `event: image_generation.completed\n` +
    `data: ${JSON.stringify({ b64_json: b64 })}\n\n`;

  return new Response(sse, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});