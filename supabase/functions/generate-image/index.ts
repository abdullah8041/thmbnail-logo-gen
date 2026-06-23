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

  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) {
    return new Response("Missing OPENAI_API_KEY", { status: 500, headers: corsHeaders });
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

  const upstream = await fetch(
    "https://api.openai.com/v1/images/generations",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: `${spec.hint}. ${prompt}`,
        size: spec.size,
        quality: "low",
        n: 1,
        stream: true,
        partial_images: 2,
      }),
    },
  );

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new Response(text || "Upstream error", {
      status: upstream.status,
      headers: corsHeaders,
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});