const STORAGE_KEY = "thumbly:api-key";

export type Provider = "openai" | "lovable";

export type KeyInfo = { key: string; provider: Provider } | null;

export function getStoredKey(): KeyInfo {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY)?.trim();
  if (!raw) return null;
  return { key: raw, provider: detectProvider(raw) };
}

export function setStoredKey(key: string) {
  const trimmed = key.trim();
  if (!trimmed) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, trimmed);
  }
  window.dispatchEvent(new Event("thumbly:api-key-changed"));
}

export function detectProvider(key: string): Provider {
  return key.startsWith("sk-") ? "openai" : "lovable";
}

export function requireKey(): { key: string; provider: Provider } {
  const info = getStoredKey();
  if (!info) {
    throw new Error(
      "No API key set. Click the Settings (gear) button in the header and paste your OpenAI or Lovable API key.",
    );
  }
  return info;
}
