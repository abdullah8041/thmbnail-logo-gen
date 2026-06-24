import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Self-contained prompt enrichment. No external LLM call, no credits, no
// API keys. We classify the user's short prompt by keyword and append a
// curated pack of visual descriptors so the image model gets a rich,
// thumbnail-grade brief. Output is streamed in the same OpenAI SSE shape
// the frontend already parses.

type Category =
  | "gaming"
  | "tech"
  | "finance"
  | "fitness"
  | "food"
  | "travel"
  | "music"
  | "education"
  | "beauty"
  | "automotive"
  | "generic";

const KEYWORDS: Record<Exclude<Category, "generic">, string[]> = {
  gaming: [
    "free fire", "pubg", "fortnite", "minecraft", "valorant", "call of duty",
    "cod", "gta", "roblox", "league of legends", "lol", "dota", "csgo",
    "apex", "warzone", "gameplay", "gamer", "gaming", "esports", "stream",
    "twitch", "xbox", "playstation", "nintendo", "console", "fps", "mmo",
    "rpg", "boss", "raid",
  ],
  tech: [
    "iphone", "android", "samsung", "macbook", "laptop", "pc build", "gpu",
    "cpu", "ai", "chatgpt", "coding", "programming", "developer", "react",
    "javascript", "python", "tech", "gadget", "review", "unboxing",
  ],
  finance: [
    "stocks", "stock", "crypto", "bitcoin", "ethereum", "trading", "forex",
    "investing", "investment", "money", "passive income", "wealth",
    "finance", "business", "entrepreneur", "side hustle",
  ],
  fitness: [
    "gym", "workout", "fitness", "bodybuilding", "muscle", "abs", "cardio",
    "yoga", "weight loss", "diet", "protein", "deadlift", "squat", "bench",
  ],
  food: [
    "recipe", "cooking", "food", "chef", "baking", "cake", "pizza", "burger",
    "ramen", "sushi", "dessert", "breakfast", "dinner", "kitchen",
  ],
  travel: [
    "travel", "vlog", "japan", "paris", "dubai", "bali", "tokyo", "new york",
    "london", "vacation", "trip", "adventure", "explore", "hiking", "nature",
  ],
  music: [
    "music", "song", "rap", "hip hop", "edm", "dj", "concert", "guitar",
    "piano", "lyrics", "remix", "beat", "producer",
  ],
  education: [
    "tutorial", "how to", "learn", "study", "exam", "school", "college",
    "university", "lesson", "course", "explained", "guide",
  ],
  beauty: [
    "makeup", "skincare", "beauty", "hair", "fashion", "outfit", "ootd",
    "nails", "lipstick", "glow up",
  ],
  automotive: [
    "car", "supercar", "lamborghini", "ferrari", "tesla", "bmw", "audi",
    "porsche", "drift", "racing", "f1", "motorcycle", "bike",
  ],
};

const ENRICHMENT: Record<Category, string> = {
  gaming:
    "Highly detailed 4K gaming thumbnail, esports style, cinematic dynamic action pose, intense facial expression, explosive particle effects, neon contrast lighting, motion blur, vibrant red and blue color grading, dramatic depth of field, bold composition, click-worthy",
  tech:
    "Sleek modern 4K tech thumbnail, premium product hero shot, glossy reflections, soft studio lighting, clean minimal background, subtle blue and purple gradient glow, sharp focus on the device, ultra-detailed surfaces, high contrast, professional",
  finance:
    "Bold finance thumbnail, golden coins and rising green charts, dramatic stage lighting, dark cinematic background, money explosion effects, luxury aesthetic, sharp contrast, confident composition, ultra-detailed, eye-catching",
  fitness:
    "High-energy fitness thumbnail, dramatic gym lighting, intense muscular composition, sweat and chalk dust particles, bold orange and black color grading, cinematic motion, ultra-detailed skin and muscle definition, motivational vibe",
  food:
    "Mouth-watering food photography thumbnail, overhead 4K shot, vibrant fresh ingredients, steam rising, soft window light, shallow depth of field, rich saturated colors, glossy textures, professional culinary styling",
  travel:
    "Stunning travel thumbnail, breathtaking wide-angle landscape, golden hour lighting, vibrant skies, cinematic color grading, ultra-detailed, sense of scale and adventure, postcard-perfect composition",
  music:
    "Vibrant music thumbnail, stage lights and lens flares, dynamic concert atmosphere, bold neon color grading, motion-blurred crowd, cinematic depth, ultra-detailed, energetic mood",
  education:
    "Clean educational thumbnail, large bold typography area, friendly bright lighting, clear focal subject, modern flat-meets-realistic style, blue and yellow accent palette, high readability, professional",
  beauty:
    "Glamorous beauty thumbnail, soft pink and gold lighting, flawless detailed skin, glossy textures, luxury cosmetic styling, dreamy bokeh background, ultra-sharp focus, high-fashion editorial aesthetic",
  automotive:
    "Cinematic automotive thumbnail, low-angle hero shot, dramatic rim lighting, glossy paint reflections, motion blur and tire smoke, sunset color grading, ultra-detailed bodywork, premium magazine cover style",
  generic:
    "Highly detailed 4K thumbnail, cinematic lighting, vibrant saturated colors, dramatic composition, sharp focus, professional photography, eye-catching click-worthy design, ultra-detailed, high contrast",
};

function classify(text: string): Category {
  const lower = text.toLowerCase();
  for (const [cat, words] of Object.entries(KEYWORDS) as [
    Exclude<Category, "generic">,
    string[],
  ][]) {
    if (words.some((w) => lower.includes(w))) return cat;
  }
  return "generic";
}

function enrich(raw: string): string {
  const clean = raw.trim().replace(/\s+/g, " ");
  if (!clean) return "";
  const category = classify(clean);
  return `${clean} — ${ENRICHMENT[category]}`;
}

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
  const text = enrich(lastUser?.content ?? "");

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