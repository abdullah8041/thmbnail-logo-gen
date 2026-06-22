import { useCallback, useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { History, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  type HistoryItem,
  groupHistoryByDate,
} from "@/lib/history";

type Props = {
  /** Optional list of kinds to show. Omit to show all. */
  kinds?: string[];
  /** Called when the user clicks a history entry. */
  onOpen?: (item: HistoryItem) => void;
};

export function HistoryDrawer({ kinds, onOpen }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase
      .from("generation_history")
      .select("id,user_id,kind,prompt,image_url,meta,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (kinds && kinds.length) q = q.in("kind", kinds);
    const { data, error } = await q;
    if (error) {
      console.error("[history] fetch failed", error);
    }
    setItems((data ?? []) as HistoryItem[]);
    setLoading(false);
  }, [user, kinds]);

  // Fetch on mount / when the signed-in user changes — so the drawer
  // already has content the first time it opens.
  useEffect(() => {
    load();
  }, [load]);

  // Live updates: refresh when this user's history changes.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`history:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "generation_history",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          load();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  async function remove(id: string) {
    setItems((cur) => cur.filter((i) => i.id !== id));
    await supabase.from("generation_history").delete().eq("id", id);
  }

  const groups = groupHistoryByDate(items);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Open generation history"
          className="border-border/60 bg-card/60 backdrop-blur hover:border-accent/60 hover:text-accent"
        >
          <History className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[88vw] max-w-sm border-r border-border/40 bg-background/95 p-0 backdrop-blur-xl sm:w-96"
      >
        <SheetHeader className="border-b border-border/40 px-6 py-5 text-left">
          <SheetTitle className="font-display text-xl">
            Generation <span className="text-gradient-pink-cyan">History</span>
          </SheetTitle>
          <SheetDescription className="font-mono text-[11px] uppercase tracking-wider">
            Tap any item to reopen it
          </SheetDescription>
        </SheetHeader>

        <div className="h-[calc(100vh-6.25rem)] overflow-y-auto px-3 py-3">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="px-3 py-12 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Nothing here yet — your generations will appear here.
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map((g) => (
                <div key={g.label}>
                  <div className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {g.label}
                  </div>
                  <ul className="space-y-1.5">
                    {g.items.map((it) => (
                      <li key={it.id}>
                        <div className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card/40 p-2 transition hover:border-accent/50 hover:bg-accent/5">
                          <button
                            onClick={() => {
                              onOpen?.(it);
                              setOpen(false);
                            }}
                            className="flex flex-1 items-center gap-3 text-left"
                          >
                            <img
                              src={it.image_url}
                              alt=""
                              className="h-12 w-12 shrink-0 rounded-lg border border-border/60 object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-medium text-foreground">
                                {it.prompt}
                              </div>
                              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                {labelForKind(it.kind)} ·{" "}
                                {new Date(it.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={() => remove(it.id)}
                            aria-label="Delete entry"
                            className="rounded-md p-1.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function labelForKind(kind: string): string {
  switch (kind) {
    case "thumbnail-youtube":
      return "YouTube";
    case "thumbnail-tiktok":
      return "TikTok";
    case "logo-square":
      return "Square logo";
    case "logo-wide":
      return "Wide logo";
    default:
      return kind;
  }
}