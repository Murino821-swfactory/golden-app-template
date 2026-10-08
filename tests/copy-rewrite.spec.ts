import { test, expect } from "@playwright/test";
import {
  INSTRUCTIONS_MAX_CHARS,
  charCount,
  copyPanelView,
  diffCopy,
  errorKey,
  estimateTokens,
  formatEur,
  parseCopyStatus,
  type CopyPanelInput,
  type CopyStatus,
} from "../lib/copy-rewrite";

/**
 * The copy-rewrite panel (sw-factory spec 2026-09-30-prototype-copy-rewrite-design.md §8).
 * The signed-in path cannot be driven end to end here (Google Sign-In needs secrets), so the
 * pure half pins the parser and the panel's state table; the browser half checks that an
 * anonymous visitor never sees the CTA and never calls the API.
 */

const DRAFT = {
  id: "AAAAAAAAAAAAAAAAAAAA",
  status: "done",
  code: null,
  createdAt: 100,
  usable: true,
  baseContent: { en: { description: "Old", cta: { label: "Go" } } },
  content: { en: { description: "New", cta: { label: "Go" } } },
  metrics: { costEur: 0.0612, tokensOut: 3100, copyChars: 2400, jsonOverhead: 0.31, fieldsChanged: 1, fieldsTotal: 2 },
  systemPrompt: "sys",
  userPrompt: "user",
};

function status(over: Partial<CopyStatus> = {}): CopyStatus {
  return { ...parseCopyStatus({ role: "owner", instructions: "Mine.", isDefault: false, draftsLeftToday: 7, history: [] })!, ...over };
}

function view(over: Partial<CopyPanelInput> = {}) {
  return copyPanelView({ status: status(), instructions: "Shorter.", working: false, timedOut: false, actionError: null, ...over });
}

test.describe("copy rewrite: parsing and state", () => {
  test("status: a role is required; numbers default to zero; unknown statuses read as failed", () => {
    expect(parseCopyStatus({ role: null })).toBeNull();
    expect(parseCopyStatus("nope")).toBeNull();
    const s = parseCopyStatus({
      role: "admin",
      instructions: "x",
      draftsLeftToday: null,
      pending: { kind: "publish", requestId: "R", stage: "build" },
      latestDraft: { ...DRAFT, status: "weird" },
      history: [{ id: "h", kind: "draft", status: "done", metrics: { costEur: "0.1" } }],
    })!;
    expect(s.role).toBe("admin");
    expect(s.draftsLeftToday).toBeNull();
    expect(s.pending).toEqual({ kind: "publish", requestId: "R", stage: "build" });
    expect(s.latestDraft?.status).toBe("failed");
    expect(s.latestDraft?.metrics?.tokensOut).toBe(3100);
    expect(s.latestDraft?.metrics?.cacheRead).toBe(0);
    expect(s.history[0]!.metrics?.costEur).toBe(0);
  });

  test("characters are counted as a person counts them; tokens are a labelled estimate", () => {
    expect(charCount("📖 ok")).toBe(4);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
  });

  test("diff: every text of the preview next to the current one, changed ones marked", () => {
    expect(diffCopy(DRAFT.baseContent, DRAFT.content)).toEqual([
      { locale: "en", path: "description", before: "Old", after: "New", changed: true },
      { locale: "en", path: "cta.label", before: "Go", after: "Go", changed: false },
    ]);
    expect(diffCopy(null, { sk: { a: ["x"] } })).toEqual([{ locale: "sk", path: "a[0]", before: null, after: "x", changed: true }]);
  });

  test("money reads at the precision a single request needs", () => {
    expect(formatEur(0.0612)).toBe("€0.061");
    expect(formatEur(0.0042)).toBe("€0.0042");
    expect(formatEur(1.5)).toBe("€1.50");
  });

  test("server codes map to the panel's messages; gate failures share one", () => {
    expect(errorKey("no-credits")).toBe("noCredits");
    expect(errorKey("gate-smoke")).toBe("gate");
    expect(errorKey("stale-draft")).toBe("staleDraft");
    expect(errorKey("internal")).toBe("generic");
    expect(errorKey(null)).toBe("generic");
  });

  test("a preview can be asked for only with instructions, a free lock and previews left", () => {
    expect(view().canDraft).toBe(true);
    expect(view({ instructions: "   " }).canDraft).toBe(false);
    expect(view({ instructions: "x".repeat(INSTRUCTIONS_MAX_CHARS + 1) }).canDraft).toBe(false);
    expect(view({ working: true }).canDraft).toBe(false);
    expect(view({ status: status({ draftsLeftToday: 0 }) })).toMatchObject({ canDraft: false, message: { key: "limitReached" } });
    expect(view({ status: status({ draftsLeftToday: null, role: "admin" }) }).canDraft).toBe(true);
  });

  test("while a preview runs the button says so; while a publish runs, its step is shown", () => {
    const drafting = view({ status: status({ pending: { kind: "draft", requestId: "R", stage: null } }) });
    expect(drafting).toMatchObject({ canDraft: false, draftLabel: "drafting", publish: null });
    const publishing = view({ status: status({ pending: { kind: "publish", requestId: "R", stage: "build" } }) });
    expect(publishing.publish).toEqual({ label: "publishing", disabled: true });
    expect(publishing.message).toEqual({ key: "publishing", values: { stage: "build" } });
  });

  test("a usable preview offers publishing — for a credit to the creator, free to the founder", () => {
    const latestDraft = parseCopyStatus({ role: "owner", latestDraft: DRAFT })!.latestDraft;
    expect(view({ status: status({ latestDraft }) })).toMatchObject({
      showPreview: true,
      publish: { label: "publishOwner", disabled: false },
    });
    expect(view({ status: status({ role: "admin", latestDraft }) }).publish?.label).toBe("publishAdmin");
    const old = { ...latestDraft!, usable: false };
    expect(view({ status: status({ latestDraft: old }) }).publish).toBeNull();
  });

  test("the newest result speaks: a failed preview, a failed or finished publish, a refusal", () => {
    const failedDraft = parseCopyStatus({ role: "owner", latestDraft: { ...DRAFT, status: "failed", code: "invalid-response", createdAt: 300 } })!.latestDraft;
    expect(view({ status: status({ latestDraft: failedDraft }) }).message).toEqual({ key: "errors.invalidResponse" });

    const latestDraft = parseCopyStatus({ role: "owner", latestDraft: DRAFT })!.latestDraft;
    const done = { id: "P", status: "done" as const, code: null, stage: "done", url: null, createdAt: 200 };
    expect(view({ status: status({ latestDraft, latestPublish: done }) })).toMatchObject({
      published: true,
      publish: null,
      message: { key: "published" },
    });
    const failed = { ...done, status: "failed" as const, code: "stale-draft" };
    expect(view({ status: status({ latestDraft, latestPublish: failed }) }).message).toEqual({ key: "errors.staleDraft" });

    expect(view({ actionError: "no-credits" }).message).toEqual({ key: "errors.noCredits" });
    expect(view({ timedOut: true, actionError: "busy" }).message).toEqual({ key: "slow" });
  });
});

test("an anonymous visitor sees no CTA and never calls the copy API", async ({ page }) => {
  const calls: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/prototype-copy")) calls.push(req.url());
  });
  await page.goto("./");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("[data-copy-rewrite-open]")).toHaveCount(0);
  expect(calls).toEqual([]);
});
