import { Link } from "react-router-dom";
import { Crown, MessageCircle, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const WA = `https://wa.me/923080364133?text=${encodeURIComponent(
  "Hi! I'd like to top up my Thumbly credits via EasyPaisa / JazzCash.",
)}`;

export function NoCreditsModal() {
  const { showNoCredits, setShowNoCredits } = useAuth();
  return (
    <Dialog open={showNoCredits} onOpenChange={setShowNoCredits}>
      <DialogContent className="bento-tile border-primary/40 sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl border border-primary/40 bg-primary/15 text-primary glow-pink">
            <Crown className="h-5 w-5" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Free Credits <span className="text-gradient-pink-cyan">Exhausted!</span>
          </DialogTitle>
          <DialogDescription className="text-center">
            Upgrade to Premium to continue generating thumbnails and logos.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 grid gap-2">
          <Button asChild size="lg" className="bg-primary text-primary-foreground glow-pink hover:brightness-110">
            <Link to="/pricing" onClick={() => setShowNoCredits(false)}>
              <Sparkles className="h-4 w-4" /> View pricing plans
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full gap-2 border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]">
            <a href={WA} target="_blank" rel="noopener noreferrer" onClick={() => setShowNoCredits(false)}>
              <MessageCircle className="h-4 w-4" /> Pay via EasyPaisa / JazzCash
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}