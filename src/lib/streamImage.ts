import { createParser } from "eventsource-parser";
import { flushSync } from "react-dom";

type Payload = { b64_json: string };

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_ATTEMPTS = 3;

async function streamImageOnce(
  endpoint: string,
  body: unknown,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
  timeoutMs: number,
): Promise<void> {
  const controller = new AbortController();
  let lastActivity = Date.now();
  const timer = setInterval(() => {
    if (Date.now() - lastActivity > timeoutMs) controller.abort();
  }, 1000);

  try {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(
      `Image generation failed: ${res.status} ${await res.text().catch(() => "")}`,
    );
  }

  let sawCompleted = false;
  const parser = createParser({
    onEvent(event) {
      if (
        event.event !== "image_generation.partial_image" &&
        event.event !== "image_generation.completed"
      )
        return;
      let payload: Payload;
      try {
        payload = JSON.parse(event.data) as Payload;
      } catch {
        return;
      }
      const isFinal = event.event === "image_generation.completed";
      flushSync(() => {
        onFrame(`data:image/png;base64,${payload.b64_json}`, isFinal);
      });
      if (isFinal) sawCompleted = true;
    },
  });

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      lastActivity = Date.now();
      parser.feed(value);
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  if (!sawCompleted) throw new Error("Image stream ended without a completed event");
  } finally {
    clearInterval(timer);
  }
}

export async function streamImage(
  endpoint: string,
  body: unknown,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
  opts: { timeoutMs?: number; maxAttempts?: number } = {},
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let receivedAny = false;
    const wrapped = (dataUrl: string, isFinal: boolean) => {
      receivedAny = true;
      onFrame(dataUrl, isFinal);
    };
    try {
      await streamImageOnce(endpoint, body, wrapped, timeoutMs);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) break;
      // If the server returned a hard HTTP error, don't retry.
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("Image generation failed:")) break;
      // Backoff before retry
      await new Promise((r) => setTimeout(r, 500 * attempt));
      void receivedAny;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}