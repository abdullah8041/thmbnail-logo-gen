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

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ type: "config_error", message: "LOVABLE_API_KEY is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const fullPrompt = `${spec.hint}. ${prompt}`;

  // Gemini image models on the Lovable AI Gateway use the OpenRouter
  // chat-completions image shape: messages + modalities. No `prompt`, no
  // `quality`, no `partial_images` — Gemini emits partial frames natively
  // when stream is true. The Gateway normalizes the SSE events into the
  // OpenAI `image_generation.partial_image` / `image_generation.completed`
  // shape the client already parses.
  let upstream: Response;
  try {
    upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image",
        messages: [{ role: "user", content: fullPrompt }],
        modalities: ["image", "text"],
        stream: true,
      }),
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        type: "upstream_error",
        message: `Failed to reach Lovable AI Gateway: ${err instanceof Error ? err.message : String(err)}`,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    if (upstream.status === 402) {
      return new Response(
        JSON.stringify({ type: "credits_exhausted", message: "Lovable AI credits exhausted. Add credits to continue." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (upstream.status === 429) {
      return new Response(
        JSON.stringify({ type: "rate_limited", message: "Rate limit exceeded. Try again shortly." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ type: "upstream_error", message: text || `Gateway error ${upstream.status}` }),
      { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Forward the SSE body straight through to the client so partial_image
  // previews stream in real time. Do not buffer or re-wrap.
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