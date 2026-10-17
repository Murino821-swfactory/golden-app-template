import type {
  ApiOutcome, AssistantResponse, AssistantTurn, Digest, GitpulseLocale, ImageAspect,
  ImageResponse, ImageStyle, SpeechResponse, TextKind, TextResponse, TtsVoice, UiError,
} from "./types";

/**
 * The client half of `/api/gitpulse/*` (factory-web `gitpulseApi`).
 *
 * The path is RELATIVE TO THE ORIGIN, not to the prototype's base path: Firebase Hosting
 * on apps.tokenwise.sk rewrites `/api/gitpulse/**` to the function, next to
 * `/newapp/<slug>/**` for the pages — the same way law-expert and the contact form reach
 * their endpoints. Every call requires the visitor's Firebase ID token; the server
 * verifies it and holds the daily quotas.
 */

const BASE = "/api/gitpulse";

export function errorFromResponse(status: number, body: unknown): UiError {
  const b = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  if (status === 401 && b.error === "auth") return "auth";
  if (status === 400 && b.error === "invalid") return "invalid";
  if (status === 429 && b.error === "quota") {
    if (b.reason === "user-daily") return "quota-user";
    if (b.reason === "global-daily") return "quota-global";
    if (b.reason === "rate") return "rate";
  }
  if (status === 502 && b.error === "model") return "model";
  return "internal";
}

async function call<T>(path: string, payload: unknown, getToken: () => Promise<string | null>): Promise<ApiOutcome<T>> {
  const token = await getToken().catch(() => null);
  if (!token) return { ok: false, error: "auth" };
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, error: "network" };
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, error: errorFromResponse(res.status, body) };
  return { ok: true, data: body as T };
}

export type GetToken = () => Promise<string | null>;

export function generateText(
  input: { kind: TextKind; locale: GitpulseLocale; digest: Digest; instructions?: string },
  getToken: GetToken
): Promise<ApiOutcome<TextResponse>> {
  return call<TextResponse>("/text", input, getToken);
}

export function generateImage(
  input: { repo: string; headline: string; style?: ImageStyle; aspectRatio?: ImageAspect },
  getToken: GetToken
): Promise<ApiOutcome<ImageResponse>> {
  return call<ImageResponse>("/image", input, getToken);
}

export function generateSpeech(
  input: { text: string; voice?: TtsVoice; style?: string },
  getToken: GetToken
): Promise<ApiOutcome<SpeechResponse>> {
  return call<SpeechResponse>("/speech", input, getToken);
}

export function askAssistant(
  input: { messages: AssistantTurn[]; locale: GitpulseLocale; digest?: Digest },
  getToken: GetToken
): Promise<ApiOutcome<AssistantResponse>> {
  return call<AssistantResponse>("/assistant", input, getToken);
}
