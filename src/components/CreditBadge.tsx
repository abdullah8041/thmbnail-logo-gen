import { Link } from "react-router-dom";
import { Coins, Crown, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";

export function CreditBadge() {
  const { profile, isAdmin, signOut } = useAuth();
  if (!profile) return null;
  const unlimited = profile.status === "premium";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 gap-2 border-accent/40 bg-accent/10 px-3 text-accent hover:bg-accent/20 hover:text-accent"
        >
          {unlimited ? <Crown className="h-3.5 w-3.5" /> : <Coins className="h-3.5 w-3.5" />}
          <span className="font-mono text-xs">
            {unlimited ? "Unlimited" : `${profile.credits} credit${profile.credits === 1 ? "" : "s"}`}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-xs">{profile.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/pricing">
            <Crown className="mr-2 h-4 w-4" /> Pricing & upgrade
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin">
              <ShieldCheck className="mr-2 h-4 w-4" /> Admin panel
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}