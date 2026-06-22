import { createParser } from "eventsource-parser";
import { flushSync } from "react-dom";

type Payload = { b64_json: string };

export async function streamImage(
  endpoint: string,
  body: unknown,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
): Promise<void> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
      const mime = payload.b64_json.startsWith("/9j/") ? "image/jpeg" : "image/png";
      flushSync(() => {
        onFrame(`data:${mime};base64,${payload.b64_json}`, isFinal);
      });
      if (isFinal) sawCompleted = true;
    },
  });

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(value);
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  if (!sawCompleted) throw new Error("Image stream ended without a completed event");
}