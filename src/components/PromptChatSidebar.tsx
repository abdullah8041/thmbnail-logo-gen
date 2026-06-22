import { useEffect, useRef, useState } from "react";
import { createParser, type EventSourceMessage } from "eventsource-parser";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Wand2, Copy, Check, Loader2, Send, ArrowRight, Shapes } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

type Kind = "thumbnail" | "logo";

const PRESETS: Record<
  Kind,
  { title: string; description: string; starter: string; placeholder: string; triggerLabel: string; icon: typeof Wand2 }
> = {
  thumbnail: {
    title: "Prompt Assistant",
    description: "Turn simple topics into detailed thumbnail prompts.",
    starter:
      'Give me a simple topic (e.g. "react to dragon" or "cooking pasta") and I\'ll rewrite it into a detailed, click-worthy thumbnail prompt.',
    placeholder: "Enter a simple topic...",
    triggerLabel: "Prompt assistant",
    icon: Wand2,
  },
  logo: {
    title: "Logo Prompt Expert",
    description: "Turn a brand idea into a detailed logo prompt.",
    starter:
      'Tell me about your brand (e.g. "Verdant — sustainable coffee" or "Nimbus, a fintech app") and I\'ll craft a detailed logo prompt.',
    placeholder: "Describe your brand...",
    triggerLabel: "Logo expert",
    icon: Shapes,
  },
};

export function PromptChatSidebar({
  onUsePrompt,
  kind = "thumbnail",
}: {
  onUsePrompt: (prompt: string) => void;
  kind?: Kind;
}) {
  const preset = PRESETS[kind];
  const TriggerIcon = preset.icon;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: preset.starter },
  ]);
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, streaming]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/rewrite-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          messages: next.filter((m) => m.content.trim().length > 0),
        }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());

      const parser = createParser({
        onEvent: (e: EventSourceMessage) => {
          if (!e.data || e.data === "[DONE]") return;
          try {
            const json = JSON.parse(e.data);
            const delta: string = json.choices?.[0]?.delta?.content ?? "";
            if (!delta) return;
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              copy[copy.length - 1] = { ...last, content: last.content + delta };
              return copy;
            });
          } catch {
            /* ignore */
          }
        },
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content:
            "Sorry, I couldn't rewrite that. " +
            (err instanceof Error ? err.message : ""),
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 hover:text-accent"
        >
          <TriggerIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{preset.triggerLabel}</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-border/40 bg-background/95 p-0 backdrop-blur-xl sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/40 px-6 py-5">
          <SheetTitle className="flex items-center gap-2 font-display text-lg">
            <TriggerIcon className="h-4 w-4 text-accent" />
            <span className="text-gradient-pink-cyan">{preset.title}</span>
          </SheetTitle>
          <SheetDescription>{preset.description}</SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {messages.map((m, i) => (
            <ChatBubble
              key={i}
              message={m}
              streaming={streaming && i === messages.length - 1 && m.role === "assistant"}
              onUsePrompt={
                m.role === "assistant" && i > 0
                  ? (text) => {
                      onUsePrompt(text);
                      setOpen(false);
                    }
                  : undefined
              }
            />
          ))}
        </div>

        <div className="border-t bg-card p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={preset.placeholder}
              className="min-h-11 max-h-32 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button size="icon" onClick={send} disabled={streaming || !input.trim()}>
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Enter to send · Shift+Enter for newline
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ChatBubble({
  message,
  streaming,
  onUsePrompt,
}: {
  message: Msg;
  streaming: boolean;
  onUsePrompt?: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm">
        {message.content || (streaming ? "…" : "")}
        {streaming && message.content && <span className="ml-0.5 animate-pulse">▍</span>}
      </div>
      {onUsePrompt && message.content && !streaming && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={copy} className="h-7 gap-1.5 text-xs">
            {copied ? (
              <>
                <Check className="h-3 w-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copy
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={() => onUsePrompt(message.content)}
            className="h-7 gap-1.5 text-xs"
          >
            Use as prompt <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}