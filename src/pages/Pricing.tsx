import { Link } from "react-router-dom";
import { Check, Crown, Sparkles, MessageCircle } from "lucide-react";
import { SiteShell } from "@/components/SiteShell";
import { AppNavDrawer } from "@/components/AppNavDrawer";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/lib/usePageMeta";

const WHATSAPP = "923080364133";
const WA_URL = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
  "Hi! I'd like to buy Thumbly credits via EasyPaisa / JazzCash.",
)}`;

const PLANS = [
  {
    name: "Starter",
    price: "$5",
    credits: "50 credits",
    perks: ["50 generations", "Thumbnails · Logos", "Email support"],
    accent: "cyan" as const,
  },
  {
    name: "Pro",
    price: "$20",
    credits: "Unlimited access",
    perks: ["Unlimited generations", "Priority rendering", "All future tools included"],
    accent: "pink" as const,
    featured: true,
  },
];

export default function PricingPage() {
  usePageMeta({
    title: "Pricing — Thumbly",
    description: "Simple credit packs and unlimited Pro access for Thumbly's AI thumbnails, logos and clips.",
  });
  return (
    <SiteShell nav={<AppNavDrawer />}>
      <header className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
          <Crown className="h-3 w-3" /> Pricing
        </div>
        <h1 className="mt-4 text-5xl font-bold sm:text-6xl">
          Upgrade and keep <span className="text-gradient-pink-cyan">creating</span>.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Every account starts with 3 free credits. Top up below or go unlimited.
        </p>
      </header>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        {PLANS.map((p) => (
          <PlanCard key={p.name} {...p} />
        ))}
      </section>

      <section className="mt-10">
        <div className="bento-tile flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
              Local Payments · Pakistan
            </div>
            <h2 className="mt-2 text-xl font-semibold">EasyPaisa / JazzCash</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Prefer to pay locally? Send payment via EasyPaisa or JazzCash and we'll add credits to your account manually within minutes.
            </p>
          </div>
          <Button asChild size="lg" className="gap-2 bg-[#25D366] text-black hover:brightness-110">
            <a href={WA_URL} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" /> Pay via WhatsApp
            </a>
          </Button>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Need a custom plan?{" "}
        <Link to="/" className="text-accent hover:underline">Contact us</Link>.
      </p>
    </SiteShell>
  );
}

function PlanCard({
  name,
  price,
  credits,
  perks,
  accent,
  featured,
}: {
  name: string;
  price: string;
  credits: string;
  perks: string[];
  accent: "pink" | "cyan";
  featured?: boolean;
}) {
  const glow = accent === "pink" ? "glow-pink" : "glow-cyan";
  const ring = accent === "pink" ? "border-primary/40" : "border-accent/40";
  return (
    <div className={`bento-tile flex flex-col p-7 ${featured ? `${glow} ${ring}` : ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">{name}</h3>
        {featured && (
          <span className="rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
            Most popular
          </span>
        )}
      </div>
      <p className="mt-3 text-4xl font-bold">
        {price}
        <span className="ml-1 text-sm font-normal text-muted-foreground">/ one-time</span>
      </p>
      <p className="mt-1 text-sm text-accent">{credits}</p>
      <ul className="mt-6 flex-1 space-y-2 text-sm">
        {perks.map((perk) => (
          <li key={perk} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>{perk}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Button disabled className="w-full gap-2" variant="outline">
          <Sparkles className="h-4 w-4" /> Stripe (soon)
        </Button>
        <Button disabled className="w-full gap-2" variant="outline">
          PayPal (soon)
        </Button>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        International checkout — coming online soon.
      </p>
    </div>
  );
}