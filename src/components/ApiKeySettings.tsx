import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings, KeyRound, Check } from "lucide-react";
import { detectProvider, getStoredKey, setStoredKey } from "@/lib/apiKey";

export function ApiKeySettings() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = () => {
      const info = getStoredKey();
      setHasKey(!!info);
      setValue(info?.key ?? "");
    };
    sync();
    window.addEventListener("thumbly:api-key-changed", sync);
    return () => window.removeEventListener("thumbly:api-key-changed", sync);
  }, []);

  const provider = value.trim() ? detectProvider(value.trim()) : null;

  function save() {
    setStoredKey(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
    setTimeout(() => setOpen(false), 400);
  }

  function clear() {
    setStoredKey("");
    setValue("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="API key settings"
          className={`relative h-9 w-9 border-border/50 ${
            hasKey ? "text-accent" : "text-muted-foreground"
          }`}
        >
          <Settings className="h-4 w-4" />
          {hasKey && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_currentColor]" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-accent" /> API Key
          </DialogTitle>
          <DialogDescription>
            Paste your <strong>OpenAI</strong> key (starts with{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">sk-</code>) for DALL·E 3, or
            your <strong>Lovable</strong> API key. Stored only in your browser (localStorage).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="apikey">API key</Label>
            <Input
              id="apikey"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
              }}
            />
          </div>
          {provider && (
            <p className="text-xs text-muted-foreground">
              Detected provider:{" "}
              <span className="font-mono text-accent">
                {provider === "openai" ? "OpenAI (DALL·E 3)" : "Lovable AI Gateway"}
              </span>
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Your key is sent directly from your browser to{" "}
            {provider === "lovable" ? "ai.gateway.lovable.dev" : "api.openai.com"}. Never stored
            on any server.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {hasKey && (
            <Button variant="ghost" onClick={clear} className="mr-auto text-muted-foreground">
              Clear
            </Button>
          )}
          <Button onClick={save} disabled={!value.trim()}>
            {saved ? (
              <>
                <Check className="h-4 w-4" /> Saved
              </>
            ) : (
              "Save key"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
