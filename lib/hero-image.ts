/**
 * The AI hero background — what the page asks the server, and which buttons it shows.
 *
 * Two sources of truth, on purpose (sw-factory spec
 * docs/superpowers/specs/2026-09-25-prototype-hero-image-design.md §4.2, §5.3):
 *
 * - Every visitor reads `<basePath>/hero-image.json`. This template ships it as a static
 *   `public/hero-image.json` = `{"visible":false}`, so the harness sandbox, the template
 *   CI and local dev get a 200 and the smoke gate's "no console errors" holds without
 *   knowing this feature exists. On apps.tokenwise.sk, factory-web rewrites the same path
 *   to its `prototypeHeroImage` function.
 * - The prototype's creator and the founder, once signed in, POST to
 *   `/api/prototype-hero-image` (site root, like the contact form) and see the uncached
 *   state at once. NEVER call it without a signed-in user: an anonymous visitor, and the
 *   smoke gate, must not produce a request the static server cannot answer.
 */

export type HeroRole = "owner" | "admin";
export type Generation = "idle" | "pending" | "failed";

export interface PublicHeroState {
  visible: boolean;
  src?: string;
}

export interface HeroStatus {
  role: HeroRole;
  visible: boolean;
  src?: string;
  generation: Generation;
  ownerCanGenerate: boolean;
  lastFailureCode?: string;
}

export const HERO_IMAGE_API = "/api/prototype-hero-image";
/** How often a pending generation is re-checked, and for how long. */
export const POLL_INTERVAL_MS = 2500;
export const POLL_LIMIT_MS = 3 * 60_000;

/** A same-origin path, never a URL somewhere else: the server only ever sends these. */
function isSafeSrc(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");
}

export function parsePublicState(body: unknown): PublicHeroState {
  if (typeof body !== "object" || body === null) return { visible: false };
  const b = body as Record<string, unknown>;
  if (b.visible === true && isSafeSrc(b.src)) return { visible: true, src: b.src };
  return { visible: false };
}

export function parseStatus(body: unknown): HeroStatus | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (b.role !== "owner" && b.role !== "admin") return null;
  const generation: Generation =
    b.generation === "pending" || b.generation === "failed" ? b.generation : "idle";
  const status: HeroStatus = {
    role: b.role,
    visible: b.visible === true && isSafeSrc(b.src),
    generation,
    ownerCanGenerate: b.ownerCanGenerate === true,
  };
  if (isSafeSrc(b.src)) status.src = b.src;
  if (typeof b.lastFailureCode === "string") status.lastFailureCode = b.lastFailureCode;
  return status;
}

/**
 * The public state. Any failure — network, 404, broken JSON — is "no image": the hero
 * renders exactly as it does without the feature, and nothing louder than `warn` reaches
 * the console.
 */
export async function fetchPublicHeroState(basePath: string): Promise<PublicHeroState> {
  try {
    const res = await fetch(`${basePath}/hero-image.json`, { cache: "no-cache" });
    if (!res.ok) return { visible: false };
    return parsePublicState(await res.json());
  } catch (err) {
    console.warn("[hero-image] public state unavailable:", err);
    return { visible: false };
  }
}

export type HeroAction =
  | { action: "status" }
  | { action: "generate" }
  | { action: "setVisible"; visible: boolean };

export interface ActionResponse {
  status: number;
  body: unknown;
}

export async function postHeroAction(
  token: string,
  slug: string,
  action: HeroAction
): Promise<ActionResponse> {
  const res = await fetch(HERO_IMAGE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ slug, ...action }),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// ── Which buttons ──────────────────────────────────────────────────────────────────────

/** Keys of the `heroImage` block in messages/<locale>.json. */
export type HeroMessage =
  | "generate"
  | "confirm"
  | "generating"
  | "hide"
  | "show"
  | "regenerate"
  | "retry"
  | "failed"
  | "failedRetry"
  | "unavailable"
  | "slow";

export type HeroButtonAction = "generate" | "confirm" | "hide" | "show";

export interface HeroButton {
  action: HeroButtonAction;
  label: HeroMessage;
  disabled?: boolean;
  busy?: boolean;
}

export interface HeroControlsInput {
  role: HeroRole;
  hasImage: boolean;
  visible: boolean;
  generation: Generation;
  ownerCanGenerate: boolean;
  /** The creator has pressed "Generate" once and must confirm their single try. */
  confirming: boolean;
  /** The client waited longer than `POLL_LIMIT_MS` for a pending generation. */
  timedOut: boolean;
}

export interface HeroControlsView {
  message?: HeroMessage;
  buttons: HeroButton[];
}

/**
 * The table in spec §5.3, row by row. Pure, so `tests/hero-image.spec.ts` walks it
 * without a browser — the signed-in path cannot be driven end to end in CI (Google
 * Sign-In needs secrets), so this is where its behaviour is pinned.
 */
export function heroControlsView(s: HeroControlsInput): HeroControlsView {
  if (s.generation === "pending") {
    return s.timedOut
      ? { message: "slow", buttons: [] }
      : { buttons: [{ action: "generate", label: "generating", disabled: true, busy: true }] };
  }

  const admin = s.role === "admin";
  const regenerate: HeroButton[] = admin ? [{ action: "generate", label: "regenerate" }] : [];
  const toggle: HeroButton[] = s.hasImage
    ? [s.visible ? { action: "hide", label: "hide" } : { action: "show", label: "show" }]
    : [];

  if (s.hasImage) {
    return s.generation === "failed" && admin
      ? { message: "failed", buttons: [...toggle, { action: "generate", label: "retry" }] }
      : { buttons: [...toggle, ...regenerate] };
  }

  // No image yet.
  if (admin) {
    return s.generation === "failed"
      ? { message: "failed", buttons: [{ action: "generate", label: "retry" }] }
      : { buttons: [{ action: "generate", label: "generate" }] };
  }

  if (!s.ownerCanGenerate) return { message: "unavailable", buttons: [] };
  if (s.generation === "failed") {
    return { message: "failedRetry", buttons: [{ action: "generate", label: "retry" }] };
  }
  return s.confirming
    ? { buttons: [{ action: "confirm", label: "confirm" }] }
    : { buttons: [{ action: "generate", label: "generate" }] };
}
