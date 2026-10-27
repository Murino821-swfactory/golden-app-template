/**
 * The idea chat — pure rules (founder, 2026-10-27). A floating launcher on every page of a
 * prototype opens a small chat; the bot asks "Want to improve this app?", the visitor writes
 * the idea and it is filed with the app's owner as a task on their dashboard — the server
 * is factory-web `prototypeIdea` (`/api/prototype-idea`), which decides where the task
 * goes: the founder's board for the golden demo, the portal project of an adopted
 * prototype, else the owner's inbox on the prototype.
 *
 * Like the contact form, the request is anonymous and the API lives at the SITE ROOT
 * (tokenwise.sk / apps.tokenwise.sk), never under the base path.
 */

export const IDEA_API = "/api/prototype-idea";
export const IDEA_MIN = 10;
export const IDEA_MAX = 2000;

export type IdeaStatus = "idle" | "submitting" | "sent" | "error" | "tooMany";
export type IdeaBot = "greeting" | "notConfigured" | "sent" | "error" | "tooMany";

export interface IdeaChatView {
  /** What the bot's last bubble says — a key of `ideaChat` in `messages/*.json`. */
  bot: IdeaBot;
  canType: boolean;
  canSend: boolean;
}

export function validateIdea(text: string): "short" | "long" | null {
  const n = text.trim().length;
  if (n < IDEA_MIN) return "short";
  if (n > IDEA_MAX) return "long";
  return null;
}

/** The state table of the chat: one row per situation, so the component holds no logic. */
export function ideaChatView({ slug, status, ideaValid }: { slug: string | null; status: IdeaStatus; ideaValid: boolean }): IdeaChatView {
  if (!slug) return { bot: "notConfigured", canType: false, canSend: false };
  switch (status) {
    case "submitting":
      return { bot: "greeting", canType: false, canSend: false };
    case "sent":
      return { bot: "sent", canType: false, canSend: false };
    case "error":
      return { bot: "error", canType: true, canSend: ideaValid };
    case "tooMany":
      return { bot: "tooMany", canType: true, canSend: false };
    default:
      return { bot: "greeting", canType: true, canSend: ideaValid };
  }
}

export interface IdeaPayload {
  slug: string;
  idea: string;
  email?: string;
  /** Honeypot — a bot that fills it gets a silent 200, as on the contact form. */
  website: string;
  /** The page the visitor was on (pathname), so the owner knows what the idea is about. */
  page: string;
}

export function ideaPayload(input: { slug: string; idea: string; email: string; website: string; page: string }): IdeaPayload {
  const email = input.email.trim();
  return {
    slug: input.slug,
    idea: input.idea.trim(),
    ...(email ? { email } : {}),
    website: input.website,
    page: input.page,
  };
}

export async function postIdea(payload: IdeaPayload): Promise<{ status: number; ok: boolean }> {
  const res = await fetch(IDEA_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => null)) as { ok?: boolean } | null;
  return { status: res.status, ok: res.ok && body?.ok === true };
}
