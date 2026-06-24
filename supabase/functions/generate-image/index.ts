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

  const key = Deno.env.get("HUGGINGFACE_API_KEY");
  if (!key) {
    return new Response("Missing HUGGINGFACE_API_KEY", { status: 500, headers: corsHeaders });
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

  const upstream = await fetch(
    "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "image/png",
      },
      body: JSON.stringify({
        inputs: `${spec.hint}. ${prompt}`,
        parameters: { width: w, height: h, num_inference_steps: 4 },
      }),
    },
  );

  if (!upstream.ok) {
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

  const bytes = new Uint8Array(await upstream.arrayBuffer());
  // base64 encode
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const b64 = btoa(binary);

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