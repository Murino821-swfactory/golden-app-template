import { test, expect } from "@playwright/test";
import { errorFromResponse } from "../lib/gitpulse/api";
import { buildDigest, commitHighlights, weekStart, REPO_PATTERN, SAMPLE_DIGEST } from "../lib/gitpulse/github";
import { seededRandom } from "../lib/gitpulse/music";
import { composeShareText, recordTypeFor, sharePlan } from "../lib/gitpulse/share";
import { instagramAspectOk, publishRouteFor } from "../lib/gitpulse/social";
import { recapDurationInFrames, RECAP_FPS } from "../components/gitpulse/recap-video";
import { gitpulseCopy } from "../lib/gitpulse/copy";
import { TEXT_KINDS } from "../lib/gitpulse/types";

/** Pure logic of the creation studio — no browser, no network (the records-logic pattern). */

test("weekStart is the Monday of the week, in UTC", () => {
  expect(weekStart(new Date("2026-10-16T10:00:00Z"))).toBe("2026-10-12"); // Friday → Monday
  expect(weekStart(new Date("2026-10-12T00:30:00Z"))).toBe("2026-10-12"); // Monday stays
  expect(weekStart(new Date("2026-10-18T23:00:00Z"))).toBe("2026-10-12"); // Sunday belongs to it
});

test("commitHighlights keeps first lines of real work and drops noise", () => {
  const highlights = commitHighlights([
    { message: "Checkout rewrite shipped\n\nlong body", author: "ana" },
    { message: "Merge branch 'main' into feature", author: "ana" },
    { message: "chore(deps): bump next", author: "dependabot[bot]" },
    { message: "checkout rewrite shipped", author: "bob" }, // duplicate, case-insensitive
    { message: "Fix flaky payment test", author: "bob" },
  ]);
  expect(highlights).toEqual(["Checkout rewrite shipped", "Fix flaky payment test"]);
});

test("buildDigest counts merged PRs inside the window and unique authors", () => {
  const digest = buildDigest({
    repo: "acme/app",
    weekOf: "2026-10-12",
    since: "2026-10-12T00:00:00Z",
    until: "2026-10-16T12:00:00Z",
    commits: [
      { message: "Fix", author: "Ana" },
      { message: "Feat", author: "ana" },
      { message: "Docs", author: "bob" },
    ],
    pulls: [
      { title: "Checkout rewrite", mergedAt: "2026-10-13T10:00:00Z" },
      { title: "Old one", mergedAt: "2026-10-01T10:00:00Z" },
      { title: "Still open", mergedAt: null },
    ],
    languages: ["TypeScript", "CSS", "HTML", "Shell", "Dockerfile", "Makefile"],
  });
  expect(digest.commits).toBe(3);
  expect(digest.pullRequests).toBe(1);
  expect(digest.contributors).toBe(2);
  expect(digest.languages).toHaveLength(5);
  expect(digest.highlights?.[0]).toBe("Checkout rewrite");
});

test("the sample digest satisfies the same bounds the API enforces", () => {
  expect(REPO_PATTERN.test(SAMPLE_DIGEST.repo)).toBe(true);
  expect(SAMPLE_DIGEST.highlights!.length).toBeLessThanOrEqual(8);
  expect(SAMPLE_DIGEST.highlights!.every((h) => h.length <= 140)).toBe(true);
});

test("share: X and Facebook carry the text, LinkedIn the url, clipboard platforms open theirs", () => {
  const text = composeShareText({ title: "T", body: "B", hashtags: ["dev", "#ship"] });
  expect(text).toBe("T\n\nB\n\n#dev #ship");
  expect(sharePlan("x", text, "https://p.example/")).toEqual({
    mode: "intent",
    url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
  });
  expect(sharePlan("linkedin", text, "https://p.example/").url).toContain(encodeURIComponent("https://p.example/"));
  expect(sharePlan("facebook", text, "https://p.example/").mode).toBe("intent");
  expect(sharePlan("instagram", text, "https://p.example/").mode).toBe("copy-open");
  expect(sharePlan("tiktok", text, "https://p.example/").mode).toBe("copy-open");
});

test("recordTypeFor maps kinds onto whatever options the config declares", () => {
  const oldOptions = ["Blog", "LinkedIn", "X", "Instagram", "Video"];
  const newOptions = ["Blog", "Facebook", "Instagram", "TikTok", "YouTube"];
  expect(recordTypeFor("linkedin", oldOptions)).toBe("LinkedIn");
  expect(recordTypeFor("video-script", oldOptions)).toBe("Video");
  expect(recordTypeFor("tiktok", newOptions)).toBe("TikTok");
  expect(recordTypeFor("x", newOptions)).toBe("Blog"); // unmatched falls back, never fails
  expect(recordTypeFor("blog", [])).toBeNull();
});

test("API errors map onto the UI's vocabulary", () => {
  expect(errorFromResponse(401, { error: "auth" })).toBe("auth");
  expect(errorFromResponse(429, { error: "quota", reason: "user-daily" })).toBe("quota-user");
  expect(errorFromResponse(429, { error: "quota", reason: "rate" })).toBe("rate");
  expect(errorFromResponse(502, { error: "model" })).toBe("model");
  expect(errorFromResponse(500, {})).toBe("internal");
});

test("the recap never cuts a voiceover short", () => {
  expect(recapDurationInFrames(undefined)).toBe(18 * RECAP_FPS);
  expect(recapDurationInFrames(25)).toBe(Math.ceil(26.5 * RECAP_FPS));
});

test("the generative soundtrack is deterministic per (seed, mood)", () => {
  const a = seededRandom("acme/app:2026-10-12:upbeat");
  const b = seededRandom("acme/app:2026-10-12:upbeat");
  const c = seededRandom("acme/app:2026-10-19:upbeat");
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  expect(seqA).toEqual(seqB);
  expect(seqA).not.toEqual([c(), c(), c()]);
  expect(seqA.every((x) => x >= 0 && x < 1)).toBe(true);
});

test("both locales carry the full studio vocabulary", () => {
  for (const locale of ["en", "cs"] as const) {
    const copy = gitpulseCopy(locale);
    for (const kind of TEXT_KINDS) expect(copy.text.kinds[kind]).toBeTruthy();
    expect(copy.publish.intentNote.length).toBeGreaterThan(10);
    expect(copy.errors["quota-global"].length).toBeGreaterThan(10);
  }
  expect(gitpulseCopy("cs").page.title).not.toBe(gitpulseCopy("en").page.title);
});

test("direct publishing is the founder's route, on Facebook and Instagram only", () => {
  expect(publishRouteFor("admin", "facebook")).toBe("direct");
  expect(publishRouteFor("admin", "instagram")).toBe("direct");
  expect(publishRouteFor("admin", "tiktok")).toBe("share");
  expect(publishRouteFor("admin", "site")).toBe("share");
  expect(publishRouteFor("owner", "facebook")).toBe("share");
  expect(publishRouteFor(null, "instagram")).toBe("share");
  expect(publishRouteFor(undefined, "facebook")).toBe("share");
});

test("instagram feed aspect window: the studio's square and og cards pass, a 9:16 visual does not", () => {
  expect(instagramAspectOk(1080, 1080)).toBe(true);
  expect(instagramAspectOk(1200, 630)).toBe(true);
  expect(instagramAspectOk(1080, 1350)).toBe(true);
  expect(instagramAspectOk(1080, 1920)).toBe(false);
});

test("a 403 from the publish route reads as forbidden", () => {
  expect(errorFromResponse(403, { error: "forbidden" })).toBe("forbidden");
  expect(errorFromResponse(403, {})).toBe("internal");
});

test("the direct route has its words in both locales", () => {
  for (const locale of ["en", "cs"] as const) {
    const copy = gitpulseCopy(locale);
    expect(copy.publish.direct("@tokenwisefactory")).toContain("@tokenwisefactory");
    expect(copy.publish.directButton("Instagram")).toContain("Instagram");
    expect(copy.publish.metaRefused("x")).toContain("x");
    for (const key of ["publishing", "published", "view", "needImage", "aspect"] as const) expect(copy.publish[key].length).toBeGreaterThan(0);
    expect(copy.errors.forbidden.length).toBeGreaterThan(0);
  }
});
