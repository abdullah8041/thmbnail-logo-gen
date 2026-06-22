import { supabase } from "@/integrations/supabase/client";

export type HistoryKind =
  | "thumbnail-youtube"
  | "thumbnail-tiktok"
  | "logo-square"
  | "logo-wide";

export type HistoryItem = {
  id: string;
  user_id: string;
  kind: HistoryKind | string;
  prompt: string;
  image_url: string;
  meta: Record<string, unknown>;
  created_at: string;
};

export async function saveGeneration(input: {
  kind: HistoryKind | string;
  prompt: string;
  image_url: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) {
    console.warn("[history] skip save: no authenticated user");
    return;
  }
  if (!input.image_url) {
    console.warn("[history] skip save: empty image_url");
    return;
  }
  // Cap data URLs ~9 MB to stay under Postgres TOAST/limits.
  if (input.image_url.length > 9_000_000) {
    console.warn(
      "[history] skip save: image_url too large",
      input.image_url.length,
    );
    return;
  }
  const { error } = await supabase.from("generation_history").insert({
    user_id: uid,
    kind: input.kind,
    prompt: input.prompt,
    image_url: input.image_url,
    meta: (input.meta ?? {}) as never,
  });
  if (error) {
    console.error("[history] insert failed", error);
  }
}

export function groupHistoryByDate<T extends { created_at: string }>(items: T[]) {
  const today: T[] = [];
  const yesterday: T[] = [];
  const week: T[] = [];
  const older: T[] = [];
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYday = startToday - 86_400_000;
  const startWeek = startToday - 7 * 86_400_000;
  for (const it of items) {
    const t = new Date(it.created_at).getTime();
    if (t >= startToday) today.push(it);
    else if (t >= startYday) yesterday.push(it);
    else if (t >= startWeek) week.push(it);
    else older.push(it);
  }
  return [
    { label: "Today", items: today },
    { label: "Yesterday", items: yesterday },
    { label: "Previous 7 days", items: week },
    { label: "Older", items: older },
  ].filter((g) => g.items.length > 0);
}