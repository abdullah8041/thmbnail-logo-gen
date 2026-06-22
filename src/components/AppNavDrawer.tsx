import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, Image as ImageIcon, Shapes, Film } from "lucide-react";

const ITEMS = [
  {
    to: "/" as const,
    label: "Thumbnails Creation",
    description: "Generate YouTube & TikTok thumbnails",
    icon: ImageIcon,
  },
  {
    to: "/logos" as const,
    label: "Logo Creation",
    description: "Design square & wide brand logos",
    icon: Shapes,
  },
  {
    to: "/video" as const,
    label: "AI Video Generator",
    description: "Animate a thumbnail into a 4s clip",
    icon: Film,
  },
];

export function AppNavDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = useLocation().pathname;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Open navigation"
          className="border-border/60 bg-card/60 backdrop-blur hover:border-accent/60 hover:text-accent"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 border-r border-border/40 bg-background/95 p-0 backdrop-blur-xl">
        <SheetHeader className="border-b border-border/40 px-6 py-5 text-left">
          <SheetTitle className="font-display text-xl">
            Creator <span className="text-gradient-pink-cyan">Studio</span>
          </SheetTitle>
          <SheetDescription className="font-mono text-[11px] uppercase tracking-wider">
            Pick a tool
          </SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-2 p-4">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`group flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all ${
                  active
                    ? "border-primary/50 bg-primary/10 glow-pink"
                    : "border-border/60 bg-card/40 hover:border-accent/50 hover:bg-accent/5"
                }`}
              >
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active ? "bg-primary/20 text-primary" : "bg-background/60 text-accent"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-border/40 px-6 py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          v1.0 · neon edition
        </div>
      </SheetContent>
    </Sheet>
  );
}