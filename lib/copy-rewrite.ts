/**
 * Rewriting this prototype's texts — what the panel asks the server, and what it shows.
 *
 * sw-factory spec docs/superpowers/specs/2026-09-30-prototype-copy-rewrite-design.md §8.
 * The prototype's creator and the founder edit the INSTRUCTIONS, ask for a preview (one
 * model call on the factory, ~1 minute) and may use it (the factory commits the new
 * texts and republishes this page — a few minutes; the creator pays one credit).
 *
 * Same rule as the hero image: NEVER call the API without a signed-in user, and only where
 * factory-web routes it (`ownerActionsAvailable`) — an anonymous visitor, the sandbox smoke
 * gate and the template CI must not produce a request the static server cannot answer.
 *
 * Pure except `postCopyAction`, so `tests/copy-rewrite.spec.ts` walks it without a browser.
 */

export type CopyRole = "owner" | "admin";
export type CopyKind = "draft" | "publish";
export type CopyRequestStatus = "pending" | "running" | "done" | "failed" | "abandoned";
export type CopyByLocale = Record<string, Record<string, unknown>>;

export const COPY_API = "/api/prototype-copy";
export const POLL_INTERVAL_MS = 2500;
/** A preview is one model call; a publish installs, builds twice and uploads. */
export const DRAFT_POLL_LIMIT_MS = 5 * 60_000;
export const PUBLISH_POLL_LIMIT_MS = 30 * 60_000;
/** Mirrors factory-web `INSTRUCTIONS_MAX_CHARS` — the server is the one that refuses. */
export const INSTRUCTIONS_MAX_CHARS = 4000;

export interface CopyMetricsView {
  costEur: number;
  costUsd: number;
  tokensIn: number;
  cacheRead: number;
  cacheWrite: number;
  tokensOut: number;
  durationMs: number;
  copyChars: number;
  copyWords: number;
  responseChars: number;
  jsonOverhead: number;
  fieldsChanged: number;
  fieldsTotal: number;
  eurPer1kChars: number;
  systemPromptChars: number;
  userPromptChars: number;
  instructionsChars: number;
}

export interface DraftView {
  id: string;
  status: CopyRequestStatus;
  code: string | null;
  createdAt: number;
  usable: boolean;
  baseContent: CopyByLocale | null;
  content: CopyByLocale | null;
  metrics: CopyMetricsView | null;
  systemPrompt: string | null;
  userPrompt: string | null;
}

export interface PublishView {
  id: string;
  status: CopyRequestStatus;
  code: string | null;
  stage: string | null;
  url: string | null;
  createdAt: number;
}

export interface HistoryItem {
  id: string;
  kind: CopyKind;
  status: CopyRequestStatus;
  code: string | null;
  createdAt: number;
  instructionsHash: string | null;
  metrics: CopyMetricsView | null;
}

export interface CopyStatus {
  role: CopyRole;
  instructions: string;
  isDefault: boolean;
  draftsLeftToday: number | null;
  pending: { kind: CopyKind; requestId: string; stage: string | null } | null;
  latestDraft: DraftView | null;
  latestPublish: PublishView | null;
  history: HistoryItem[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const strOrNull = (v: unknown): string | null => (typeof v === "string" ? v : null);
const STATUSES: readonly CopyRequestStatus[] = ["pending", "running", "done", "failed", "abandoned"];
const statusOf = (v: unknown): CopyRequestStatus =>
  STATUSES.includes(v as CopyRequestStatus) ? (v as CopyRequestStatus) : "failed";
const kindOf = (v: unknown): CopyKind => (v === "publish" ? "publish" : "draft");
const copyOrNull = (v: unknown): CopyByLocale | null => (isRecord(v) ? (v as CopyByLocale) : null);

const METRIC_KEYS: readonly (keyof CopyMetricsView)[] = [
  "costEur",
  "costUsd",
  "tokensIn",
  "cacheRead",
  "cacheWrite",
  "tokensOut",
  "durationMs",
  "copyChars",
  "copyWords",
  "responseChars",
  "jsonOverhead",
  "fieldsChanged",
  "fieldsTotal",
  "eurPer1kChars",
  "systemPromptChars",
  "userPromptChars",
  "instructionsChars",
];

export function parseMetrics(value: unknown): CopyMetricsView | null {
  if (!isRecord(value)) return null;
  return Object.fromEntries(METRIC_KEYS.map((key) => [key, num(value[key])])) as unknown as CopyMetricsView;
}

/** `null` = no role (or an answer this page cannot read) — the panel then does not exist. */
export function parseCopyStatus(body: unknown): CopyStatus | null {
  if (!isRecord(body)) return null;
  if (body.role !== "owner" && body.role !== "admin") return null;
  const pending = isRecord(body.pending) ? body.pending : null;
  const draft = isRecord(body.latestDraft) ? body.latestDraft : null;
  const publish = isRecord(body.latestPublish) ? body.latestPublish : null;
  return {
    role: body.role,
    instructions: typeof body.instructions === "string" ? body.instructions : "",
    isDefault: body.isDefault === true,
    draftsLeftToday: typeof body.draftsLeftToday === "number" ? body.draftsLeftToday : null,
    pending:
      pending && typeof pending.requestId === "string"
        ? { kind: kindOf(pending.kind), requestId: pending.requestId, stage: strOrNull(pending.stage) }
        : null,
    latestDraft:
      draft && typeof draft.id === "string"
        ? {
            id: draft.id,
            status: statusOf(draft.status),
            code: strOrNull(draft.code),
            createdAt: num(draft.createdAt),
            usable: draft.usable === true,
            baseContent: copyOrNull(draft.baseContent),
            content: copyOrNull(draft.content),
            metrics: parseMetrics(draft.metrics),
            systemPrompt: strOrNull(draft.systemPrompt),
            userPrompt: strOrNull(draft.userPrompt),
          }
        : null,
    latestPublish:
      publish && typeof publish.id === "string"
        ? {
            id: publish.id,
            status: statusOf(publish.status),
            code: strOrNull(publish.code),
            stage: strOrNull(publish.stage),
            url: strOrNull(publish.url),
            createdAt: num(publish.createdAt),
          }
        : null,
    history: Array.isArray(body.history)
      ? body.history.filter(isRecord).map((h) => ({
          id: String(h.id ?? ""),
          kind: kindOf(h.kind),
          status: statusOf(h.status),
          code: strOrNull(h.code),
          createdAt: num(h.createdAt),
          instructionsHash: strOrNull(h.instructionsHash),
          metrics: parseMetrics(h.metrics),
        }))
      : [],
  };
}

/** Characters as a person counts them (code points) — what the server limits. */
export function charCount(text: string): number {
  return [...text].length;
}

/** A rough guide for the creator, labelled as an estimate: ~4 characters per token. */
export function estimateTokens(text: string): number {
  return Math.ceil(charCount(text) / 4);
}

export interface FieldDiff {
  locale: string;
  path: string;
  before: string | null;
  after: string;
  changed: boolean;
}

function leaves(value: unknown, path: string, out: Array<[string, string]>): Array<[string, string]> {
  if (typeof value === "string") out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => leaves(v, `${path}[${i}]`, out));
  else if (isRecord(value)) {
    for (const [key, v] of Object.entries(value)) leaves(v, path ? `${path}.${key}` : key, out);
  }
  return out;
}

/** Every text of the preview next to what the page says now, field by field. */
export function diffCopy(base: CopyByLocale | null, next: CopyByLocale): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  for (const [locale, block] of Object.entries(next)) {
    const before = new Map(leaves(base?.[locale] ?? {}, "", []));
    for (const [path, after] of leaves(block, "", [])) {
      const was = before.get(path) ?? null;
      diffs.push({ locale, path, before: was, after, changed: was !== after });
    }
  }
  return diffs;
}

export function formatEur(value: number): string {
  if (value >= 1) return `€${value.toFixed(2)}`;
  if (value >= 0.01) return `€${value.toFixed(3)}`;
  return `€${value.toFixed(4)}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatSeconds(ms: number): string {
  return `${Math.round(ms / 1000)} s`;
}

/** Keys of `copyRewrite.errors` in messages/<locale>.json. */
export type CopyErrorKey =
  | "busy"
  | "limit"
  | "noCredits"
  | "draftUnusable"
  | "vmUnreachable"
  | "upstream"
  | "invalidResponse"
  | "staleDraft"
  | "busyVm"
  | "gate"
  | "pushFailed"
  | "timeout"
  | "generic";

const ERROR_KEYS: Record<string, CopyErrorKey> = {
  busy: "busy",
  limit: "limit",
  "no-credits": "noCredits",
  "draft-unusable": "draftUnusable",
  "vm-unreachable": "vmUnreachable",
  upstream: "upstream",
  "invalid-response": "invalidResponse",
  "stale-draft": "staleDraft",
  "busy-vm": "busyVm",
  "push-failed": "pushFailed",
  timeout: "timeout",
};

export function errorKey(code: string | null | undefined): CopyErrorKey {
  if (!code) return "generic";
  if (code.startsWith("gate-")) return "gate";
  return ERROR_KEYS[code] ?? "generic";
}

export interface CopyPanelMessage {
  key: string;
  values?: Record<string, string | number>;
}

export interface CopyPanelInput {
  status: CopyStatus;
  instructions: string;
  working: boolean;
  timedOut: boolean;
  /** A refusal of the last action (402, 409, 429), as its server code. */
  actionError: string | null;
}

export interface CopyPanelView {
  canDraft: boolean;
  draftLabel: "draft" | "drafting";
  showPreview: boolean;
  publish: { label: "publishOwner" | "publishAdmin" | "publishing"; disabled: boolean } | null;
  published: boolean;
  message: CopyPanelMessage | null;
}

const FAILED: readonly CopyRequestStatus[] = ["failed", "abandoned"];

/** The panel's state table. */
export function copyPanelView(s: CopyPanelInput): CopyPanelView {
  const { status } = s;
  const pendingKind = status.pending?.kind ?? null;
  const length = charCount(s.instructions.trim());
  const instructionsOk = length >= 1 && charCount(s.instructions) <= INSTRUCTIONS_MAX_CHARS;
  const limitReached = status.draftsLeftToday === 0;
  const draft = status.latestDraft;
  const publish = status.latestPublish;
  const publishIsNewest = Boolean(publish && (!draft || publish.createdAt >= draft.createdAt));
  const published = !pendingKind && publishIsNewest && publish?.status === "done";

  let message: CopyPanelMessage | null = null;
  if (s.timedOut) message = { key: "slow" };
  else if (pendingKind === "publish") message = { key: "publishing", values: { stage: status.pending?.stage ?? "…" } };
  else if (s.actionError) message = { key: `errors.${errorKey(s.actionError)}` };
  else if (!pendingKind && publishIsNewest && publish && FAILED.includes(publish.status)) {
    message = { key: `errors.${errorKey(publish.code)}` };
  } else if (!pendingKind && !publishIsNewest && draft && FAILED.includes(draft.status)) {
    message = { key: `errors.${errorKey(draft.code)}` };
  } else if (published) message = { key: "published" };
  else if (limitReached && !pendingKind) message = { key: "limitReached" };

  const showPublish = Boolean(draft?.usable) && !published;
  return {
    canDraft: !pendingKind && !s.working && instructionsOk && !limitReached,
    draftLabel: pendingKind === "draft" ? "drafting" : "draft",
    showPreview: Boolean(draft && draft.status === "done" && draft.content),
    publish:
      pendingKind === "publish"
        ? { label: "publishing", disabled: true }
        : showPublish
          ? { label: status.role === "owner" ? "publishOwner" : "publishAdmin", disabled: Boolean(pendingKind) || s.working }
          : null,
    published,
    message,
  };
}

export type CopyAction =
  | { action: "status" }
  | { action: "draft"; instructions: string }
  | { action: "publish"; draftId: string }
  | { action: "resetPrompt" };

export async function postCopyAction(
  token: string,
  slug: string,
  action: CopyAction
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(COPY_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ slug, ...action }),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}
