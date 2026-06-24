import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Bypass mode: OpenRouter is disabled (no credits on the free tier).
// We skip the LLM rewrite entirely and stream the user's raw prompt back
// in the same OpenAI SSE shape the frontend already parses, so the chat
// UI and "Use this prompt" flow keep working unchanged.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  let body: {
    messages?: { role: "user" | "assistant"; content: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const lastUser = [...(body.messages ?? [])]
    .reverse()
    .find((m) => m.role === "user");
  const text = (lastUser?.content ?? "").trim();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const frame = (delta: string) =>
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`,
          ),
        );

      if (text) frame(text);
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});