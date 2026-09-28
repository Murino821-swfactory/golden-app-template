import assert from "node:assert/strict";
import { test } from "node:test";
import { navFor } from "../src/header/nav";

/**
 * Founder decision 2026-09-28: a prototype's header is tokenwise.sk's, 1:1 — the same logo
 * and the same nav. A prototype is served from apps.tokenwise.sk, so the host names where
 * tokenwise.sk lives and every link points there; a relative `/articles` would land in the
 * prototype. The package itself holds no URL (it may not reach the network — package.test.ts).
 */

const SITE = "https://tokenwise.sk";

test("tokenwise.sk's own public nav stays relative", () => {
  const items = navFor("public", { hasContact: true });
  assert.equal(items.find((i) => i.label === "Articles")?.href, "/articles");
  assert.equal(items.find((i) => i.label === "Contact")?.action, "contact");
});

test("a prototype carries tokenwise.sk's public nav, every link absolute to the site", () => {
  const items = navFor("prototype", { hasContact: false, siteOrigin: SITE });
  assert.deepEqual(
    items.map((i) => [i.label, i.href]),
    [
      ["Articles", `${SITE}/articles`],
      ["Arena", `${SITE}/compare`],
      ["Projects", `${SITE}/projects`],
      ["Ideas", `${SITE}/ideas`],
      ["How It Works", `${SITE}/how-it-works`],
      ["Privacy", `${SITE}/privacy`],
      // The site's contact form is a modal with no URL; its closing act, where the contact
      // lives, is the documented way in from elsewhere (`?scene=9`, DocumentShell/StageShell).
      ["Contact", `${SITE}/?scene=9`],
    ]
  );
  assert.ok(items.every((i) => i.action === undefined), "a prototype cannot open tokenwise.sk's modal");
});

test("a trailing slash on the origin does not double the separator", () => {
  const items = navFor("prototype", { hasContact: false, siteOrigin: `${SITE}/` });
  assert.equal(items[0]?.href, `${SITE}/articles`);
});

test("a prototype host that names no site gets no nav rather than links into itself", () => {
  assert.deepEqual(navFor("prototype", { hasContact: false }), []);
});
