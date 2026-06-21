import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, Image as ImageIcon, Shapes } from "lucide-react";

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
];

export function AppNavDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open navigation">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle>Creator Studio</SheetTitle>
          <SheetDescription>Pick what you want to create</SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-3">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-muted"
                }`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}