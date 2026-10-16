import { test, expect } from "@playwright/test";
import { CHANNELS, CHANNEL_BY_ID, articleFor, captionFor, clampCaption, fileNameFor, titleFor, type ScenarioContent } from "../lib/studio/channels";
import { STUDIO_COPY } from "../lib/studio/copy";
import { PROJECTS_SNAPSHOT, hostOf, projectsSummary, shortDescription, sortProjects, toLiveProject } from "../lib/studio/projects";
import { publish, withEntry, parseLog, PUBLISH_LOG_LIMIT, type PublishEnv, type PublishLogEntry } from "../lib/studio/publish";
import { allEras, commitsOf, daysOf, groupByWeek, isRepoSlug, parseGitHubCommits, recordTotals, sortErasByCommits, weekStartOf } from "../lib/studio/record";
import { gameContent, projectsContent, recordContent, repoContent } from "../lib/studio/scenarios";
import {
  DEFAULT_GAME_CONFIG,
  EMPTY_SCORE,
  PIPELINE_STAGES,
  createShipItGame,
  levelFor,
  pickPacket,
  ridePoint,
  speedForLevel,
  stagePositions,
  type GameConfig,
} from "../lib/studio/ship-it";

/**
 * GitPulse Studio's rules without a browser: the game, the record, the weekly digest,
 * the captions per channel and the publish decision. The page is covered in studio.spec.ts.
 */

const copy = STUDIO_COPY.en;
const cfg = (over: Partial<GameConfig> = {}): GameConfig => ({ ...DEFAULT_GAME_CONFIG, ...over });
const fixed = (v: number) => () => v;

/** Run `seconds` of game time in 0.05 s frames, collecting every event. */
function run(game: ReturnType<typeof createShipItGame>, seconds: number) {
  const events = [];
  for (let t = 0; t < seconds; t += 0.05) events.push(...game.step(0.05));
  return events;
}

test.describe("ship it — the rules", () => {
  test("a task spawns, falls, and ships after riding the line once caught", () => {
    const game = createShipItGame(cfg({ defectShare: 0, spawnEvery: 1, rideSeconds: 2 }), fixed(0.5));
    run(game, 0.65);
    expect(game.packets).toHaveLength(1);
    const [p] = game.packets;
    expect(p.kind).toBe("task");
    expect(p.state).toBe("falling");
    expect(p.pos.y).toBeLessThan(DEFAULT_GAME_CONFIG.floor);

    expect(game.hit(p.id)).toMatchObject({ type: "caught", id: p.id });
    expect(game.packets[0].state).toBe("riding");
    expect(game.hit(p.id)).toBeNull();

    const events = run(game, 2.2);
    expect(events.map((e) => e.type)).toContain("shipped");
    expect(game.score.shipped).toBe(1);
    expect(game.score.missed).toBe(0);
    expect(game.packets.some((q) => q.id === p.id)).toBe(false);
  });

  test("a task that reaches the floor is missed; a defect that reaches it escapes", () => {
    const tasks = createShipItGame(cfg({ defectShare: 0, spawnEvery: 100, lifetime: 1 }), fixed(0.5));
    run(tasks, 62);
    expect(tasks.score.missed).toBe(1);
    expect(tasks.score.escaped).toBe(0);

    const defects = createShipItGame(cfg({ defectShare: 1, spawnEvery: 100, lifetime: 1 }), fixed(0.5));
    run(defects, 62);
    expect(defects.score.escaped).toBe(1);
    expect(defects.score.missed).toBe(0);
  });

  test("tapping a defect squashes it at once", () => {
    const game = createShipItGame(cfg({ defectShare: 1, spawnEvery: 1 }), fixed(0.5));
    run(game, 0.7);
    const [p] = game.packets;
    expect(game.hit(p.id)?.type).toBe("squashed");
    expect(game.packets).toHaveLength(0);
    expect(game.score).toEqual({ ...EMPTY_SCORE, squashed: 1 });
  });

  test("never exceeds the cap, and a stalled tab does not mass-expire cubes", () => {
    const game = createShipItGame(cfg({ spawnEvery: 0.1, maxFalling: 3, lifetime: 1000 }), Math.random);
    run(game, 5);
    expect(game.packets.filter((p) => p.state === "falling").length).toBeLessThanOrEqual(3);

    const stalled = createShipItGame(cfg({ spawnEvery: 0.1, lifetime: 1 }), fixed(0.5));
    run(stalled, 0.2);
    expect(stalled.packets.length).toBeGreaterThan(0);
    expect(stalled.step(60)).toEqual([]);
  });

  test("reset clears cubes and score", () => {
    const game = createShipItGame(cfg({ defectShare: 1, spawnEvery: 1 }), fixed(0.5));
    run(game, 0.7);
    game.hit(game.packets[0].id);
    game.reset();
    expect(game.packets).toHaveLength(0);
    expect(game.score).toEqual(EMPTY_SCORE);
  });

  test("levels climb with successes and speed up to a cap", () => {
    const c = cfg({ levelEvery: 3, speedStep: 0.2, maxSpeed: 2 });
    expect(levelFor(0, c)).toBe(1);
    expect(levelFor(2, c)).toBe(1);
    expect(levelFor(3, c)).toBe(2);
    expect(speedForLevel(1, c)).toBe(1);
    expect(speedForLevel(3, c)).toBeCloseTo(1.4);
    expect(speedForLevel(100, c)).toBe(2);

    const game = createShipItGame(cfg({ defectShare: 1, spawnEvery: 0.2, lifetime: 1000, levelEvery: 2 }), fixed(0.5));
    for (let t = 0; t < 6 && game.score.squashed < 2; t += 0.05) {
      game.step(0.05);
      for (const id of game.packets.filter((p) => p.state === "falling").map((p) => p.id)) game.hit(id);
    }
    expect(game.score.level).toBeGreaterThanOrEqual(2);
  });

  test("the line spans the lane and a tap picks the nearest falling cube within reach", () => {
    const stages = stagePositions();
    expect(stages).toHaveLength(PIPELINE_STAGES.length);
    expect(stages[0].x).toBe(DEFAULT_GAME_CONFIG.lane[0]);
    expect(stages[stages.length - 1].x).toBe(DEFAULT_GAME_CONFIG.lane[1]);
    expect(ridePoint(1).x).toBe(DEFAULT_GAME_CONFIG.lane[1]);
    expect(ridePoint(0.5).y).toBe(DEFAULT_GAME_CONFIG.floor);

    const packets = [
      { id: 1, kind: "task", state: "falling", pos: { x: 0.5, y: 0.5 }, vel: { x: 0, y: 0 }, age: 0, rideProgress: 0, speed: 1, spin: 0 },
      { id: 2, kind: "task", state: "falling", pos: { x: 0.52, y: 0.5 }, vel: { x: 0, y: 0 }, age: 0, rideProgress: 0, speed: 1, spin: 0 },
      { id: 3, kind: "task", state: "riding", pos: { x: 0.5, y: 0.5 }, vel: { x: 0, y: 0 }, age: 0, rideProgress: 0, speed: 1, spin: 0 },
    ] as const;
    expect(pickPacket(packets, { x: 0.515, y: 0.5 }, 0.05)).toBe(2);
    expect(pickPacket(packets, { x: 0.9, y: 0.5 }, 0.05)).toBeNull();
    // A tall stage: the same y gap is a longer distance in width units.
    expect(pickPacket(packets, { x: 0.5, y: 0.53 }, 0.05, 1)).toBe(1);
    expect(pickPacket(packets, { x: 0.5, y: 0.53 }, 0.05, 2)).toBeNull();
  });
});

test.describe("the record and the weekly digest", () => {
  test("eras carry their commit counts and sort busiest first", () => {
    expect(commitsOf({ scale: "9 days · 129 commits" })).toBe(129);
    expect(daysOf({ scale: "9 days · 129 commits" })).toBe(9);
    expect(commitsOf({ scale: "1 day · 1 commit" })).toBe(1);
    const eras = allEras();
    expect(eras.length).toBeGreaterThanOrEqual(15);
    const sorted = sortErasByCommits(eras);
    for (let i = 1; i < sorted.length; i++) expect(commitsOf(sorted[i - 1])).toBeGreaterThanOrEqual(commitsOf(sorted[i]));
    expect(sorted[0].numeral).toBe("XV");
    expect(commitsOf(sorted[0])).toBe(179);
    const totals = recordTotals(eras);
    expect(totals.commits).toBeGreaterThan(1000);
    expect(totals.eras).toBe(eras.length);
  });

  test("commits group into weeks, busiest first", () => {
    expect(weekStartOf("2026-10-16T10:00:00Z")).toBe("2026-10-12");
    expect(weekStartOf("2026-10-12T00:00:00Z")).toBe("2026-10-12");
    expect(weekStartOf("2026-10-11T23:59:59Z")).toBe("2026-10-05");
    expect(weekStartOf("garbage")).toBe("");
    const weeks = groupByWeek([
      { sha: "a", date: "2026-10-13T09:00:00Z", message: "one", author: "x" },
      { sha: "b", date: "2026-10-14T09:00:00Z", message: "two", author: "y" },
      { sha: "c", date: "2026-10-06T09:00:00Z", message: "three", author: "x" },
    ]);
    expect(weeks.map((w) => [w.weekStart, w.commits])).toEqual([
      ["2026-10-12", 2],
      ["2026-10-05", 1],
    ]);
    expect(weeks[0].authors.sort()).toEqual(["x", "y"]);
    expect(weeks[0].messages).toEqual(["two", "one"]);
  });

  test("the GitHub payload is read defensively", () => {
    const parsed = parseGitHubCommits([
      { sha: "abc", commit: { author: { date: "2026-10-13T09:00:00Z", name: "Name" }, message: "subject\n\nbody" }, author: { login: "login" } },
      { sha: "def", commit: { committer: { date: "2026-10-13T10:00:00Z" }, message: "no author" }, author: null },
      { nothing: true },
      "junk",
    ]);
    expect(parsed).toEqual([
      { sha: "abc", date: "2026-10-13T09:00:00Z", message: "subject", author: "login" },
      { sha: "def", date: "2026-10-13T10:00:00Z", message: "no author", author: "" },
    ]);
    expect(parseGitHubCommits({ message: "Not Found" })).toEqual([]);
    expect(isRepoSlug("Murino821-swfactory/golden-app-template")).toBe(true);
    expect(isRepoSlug("https://github.com/a/b")).toBe(false);
    expect(isRepoSlug("owner")).toBe(false);
  });
});

test.describe("projects", () => {
  test("the snapshot sorts by likes then date and summarises", () => {
    const sorted = sortProjects(PROJECTS_SNAPSHOT);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i - 1].likeCount).toBeGreaterThanOrEqual(sorted[i].likeCount);
    const s = projectsSummary(PROJECTS_SNAPSHOT);
    expect(s.count).toBe(PROJECTS_SNAPSHOT.length);
    expect(s.owners).toBeGreaterThan(3);
    expect(s.newest?.key).toBe("oss-billing");
    expect(hostOf("https://www.wismeo.com/sk")).toBe("wismeo.com/sk");
    expect(hostOf("https://tokenwise.sk")).toBe("tokenwise.sk");
    expect(hostOf(null)).toBe("");
    expect(shortDescription("First sentence. Second one.", 120)).toBe("First sentence.");
    expect(shortDescription("x".repeat(200), 20)).toHaveLength(20);
  });

  test("a Firestore document becomes a card, or nothing", () => {
    const ts = { toDate: () => new Date("2026-10-11T20:45:56.311Z") };
    expect(
      toLiveProject("k", { name: " Name ", description: "d", environments: { production: { url: "https://x.y" } }, likeCount: 2, creatorName: "A", ownerName: "B", createdAt: ts })
    ).toEqual({ key: "k", name: "Name", description: "d", url: "https://x.y", likeCount: 2, creatorName: "A", ownerName: "B", createdAt: "2026-10-11" });
    expect(toLiveProject("k", { name: "" })).toBeNull();
    expect(toLiveProject("k", { name: "n" })?.url).toBeNull();
  });
});

test.describe("captions, articles and the publish decision", () => {
  const long: ScenarioContent = {
    scenario: "projects",
    title: "T".repeat(140),
    summary: "S ".repeat(400),
    lines: Array.from({ length: 10 }, (_, i) => `line ${i} ${"x".repeat(150)}`),
    stats: [{ label: "a", value: "1" }],
    url: "https://tokenwise.sk/projects",
    hashtags: ["#tokenwise", "#softwarefactory"],
  };

  test("every channel gets a caption within its limit, with the link and the tags when there is room", () => {
    for (const ch of CHANNELS) {
      const caption = captionFor(ch, long);
      expect(caption.length).toBeLessThanOrEqual(ch.captionMax);
      expect(titleFor(ch, long).length).toBeLessThanOrEqual(ch.titleMax ?? 100);
    }
    const short = projectsContent(PROJECTS_SNAPSHOT, copy);
    const ig = captionFor(CHANNEL_BY_ID.instagram, short);
    expect(ig).toContain(short.url);
    expect(ig).toContain("#tokenwise");
    expect(ig.split("\n").filter((l) => l.startsWith("• "))).toHaveLength(3);
    expect(captionFor(CHANNEL_BY_ID.facebook, short).split("\n").filter((l) => l.startsWith("• "))).toHaveLength(5);
    expect(clampCaption("one two three", 9)).toBe("one two…");
    expect(clampCaption("short", 9)).toBe("short");
    expect(fileNameFor(CHANNEL_BY_ID.tiktok, short, "png", new Date("2026-10-16T12:00:00Z"))).toBe("2026-10-16-projects-tiktok.png");
  });

  test("the scenarios word themselves from data", () => {
    const projects = projectsContent(PROJECTS_SNAPSHOT, copy);
    expect(projects.stats[0]).toEqual({ label: copy.projects.statProjects, value: String(PROJECTS_SNAPSHOT.length) });
    expect(projects.lines.length).toBeLessThanOrEqual(8);

    const record = recordContent(allEras(), copy);
    expect(record.title).toContain("commits");
    expect(record.lines[0]).toContain("XV.");

    const repo = repoContent("o/r", groupByWeek([{ sha: "a", date: "2026-10-13T09:00:00Z", message: "m", author: "x" }]), copy);
    expect(repo.url).toBe("https://github.com/o/r");
    expect(repo.lines[0]).toContain("2026-10-12");

    const game = gameContent({ shipped: 4, squashed: 2, missed: 1, escaped: 0, level: 2 }, 3, "https://example.test/studio", copy);
    expect(game.lines).toHaveLength(5);
    expect(game.stats[0].value).toBe("2");
    expect(articleFor(game, copy.publish.article)).toMatch(/^# /);
    expect(articleFor(game, copy.publish.article)).toContain("https://example.test/studio");
  });

  function fakeEnv(over: Partial<PublishEnv> & { shareOn?: boolean; openOk?: boolean }) {
    const calls: { share: File[][]; copy: string[]; download: string[]; open: string[] } = { share: [], copy: [], download: [], open: [] };
    const env: PublishEnv = {
      preferShare: () => over.shareOn ?? false,
      share: async ({ files }) => {
        calls.share.push(files);
      },
      copy: async (text) => {
        calls.copy.push(text);
      },
      download: (file) => {
        calls.download.push(file.name);
      },
      open: (url) => {
        calls.open.push(url);
        return over.openOk ?? true;
      },
      ...over,
    };
    return { env, calls };
  }
  const content = gameContent({ shipped: 1, squashed: 0, missed: 0, escaped: 0, level: 1 }, 1, "https://example.test/studio", copy);
  const image = new Blob(["png"], { type: "image/png" });

  test("a phone hands the files to the share sheet; a cancelled sheet is reported as such", async () => {
    const { env, calls } = fakeEnv({ shareOn: true });
    const outcome = await publish({ channel: CHANNEL_BY_ID.instagram, content, caption: "c", image, pageUrl: "https://p" }, env);
    expect(outcome).toBe("shared");
    expect(calls.share[0].map((f) => f.name)).toEqual([expect.stringMatching(/-game-instagram\.png$/)]);
    expect(calls.open).toEqual([]);

    const aborted = fakeEnv({ shareOn: true, share: async () => Promise.reject(Object.assign(new Error("x"), { name: "AbortError" })) });
    expect(await publish({ channel: CHANNEL_BY_ID.tiktok, content, caption: "c", image, pageUrl: "https://p" }, aborted.env)).toBe("cancelled");
  });

  test("a desktop opens the profile (or share dialog) first, saves the files and copies the caption", async () => {
    const { env, calls } = fakeEnv({});
    const outcome = await publish({ channel: CHANNEL_BY_ID.facebook, content, caption: "the caption", image, pageUrl: "https://p/q" }, env);
    expect(outcome).toBe("opened");
    expect(calls.open).toEqual(["https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fp%2Fq"]);
    expect(calls.download).toHaveLength(1);
    expect(calls.copy).toEqual(["the caption"]);

    const blocked = fakeEnv({ openOk: false });
    expect(await publish({ channel: CHANNEL_BY_ID.youtube, content, caption: "c", image, video: { blob: new Blob(["v"], { type: "video/webm" }), ext: "webm" }, pageUrl: "https://p" }, blocked.env)).toBe("downloaded");
    expect(blocked.calls.open).toEqual(["https://www.youtube.com/@tokenwisefactory"]);
    expect(blocked.calls.download).toEqual([expect.stringMatching(/\.png$/), expect.stringMatching(/\.webm$/)]);

    // Instagram never gets the clip; the website gets the article as a file and on the clipboard.
    const ig = fakeEnv({});
    await publish({ channel: CHANNEL_BY_ID.instagram, content, caption: "c", image, video: { blob: new Blob(["v"]), ext: "webm" }, pageUrl: "https://p" }, ig.env);
    expect(ig.calls.download).toHaveLength(1);
    const site = fakeEnv({});
    await publish({ channel: CHANNEL_BY_ID.site, content, caption: "c", image, article: "# Article", pageUrl: "https://p" }, site.env);
    expect(site.calls.download).toEqual([expect.stringMatching(/\.png$/), expect.stringMatching(/\.md$/)]);
    expect(site.calls.copy).toEqual(["# Article"]);
    expect(site.calls.open).toEqual(["https://tokenwise.sk/"]);

    expect(await publish({ channel: CHANNEL_BY_ID.site, content, caption: "c", image: null, pageUrl: "https://p" }, fakeEnv({}).env)).toBe("failed");
  });

  test("the log keeps the newest first, deduplicates and caps", () => {
    const entry = (id: string): PublishLogEntry => ({ id, at: "2026-10-16T00:00:00.000Z", channel: "site", scenario: "game", title: "t", outcome: "opened" });
    let log: PublishLogEntry[] = [];
    for (let i = 0; i < PUBLISH_LOG_LIMIT + 5; i++) log = withEntry(log, entry(String(i)));
    expect(log).toHaveLength(PUBLISH_LOG_LIMIT);
    expect(log[0].id).toBe(String(PUBLISH_LOG_LIMIT + 4));
    expect(withEntry(log, entry(log[3].id))[0].id).toBe(log[3].id);
    expect(withEntry(log, entry(log[3].id))).toHaveLength(PUBLISH_LOG_LIMIT);
    expect(parseLog("not json")).toEqual([]);
    expect(parseLog(JSON.stringify([{ id: "a", at: "b" }, { nope: 1 }]))).toEqual([{ id: "a", at: "b" }]);
  });
});
