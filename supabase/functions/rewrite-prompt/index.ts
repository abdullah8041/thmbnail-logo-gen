import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SYSTEMS = {
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

type Kind = keyof typeof SYSTEMS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) {
    return new Response("Missing LOVABLE_API_KEY", { status: 500, headers: corsHeaders });
  }

  let body: {
    messages?: { role: "user" | "assistant"; content: string }[];
    kind?: Kind;
  };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }
  const { messages, kind } = body;
  const system = SYSTEMS[kind ?? "thumbnail"] ?? SYSTEMS.thumbnail;

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

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    if (upstream.status === 402) {
      return new Response(
        JSON.stringify({ type: "payment_required", message: "Not enough credits" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (upstream.status === 429) {
      return new Response(
        JSON.stringify({ type: "rate_limited", message: "Rate limit exceeded, please try again shortly" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ type: "upstream_error", message: text || "Upstream error" }),
      { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
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