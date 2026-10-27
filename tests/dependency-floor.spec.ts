import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * Every prototype starts from this template and `prototypes:refresh` merges it into the
 * live `demo/*` branches, so a vulnerable framework here ships everywhere. The floors are
 * the fixed releases of the Next.js advisories the template must stay above:
 * 16.4.1 — October 14, 2026 out-of-band update (GHSA-673q-mjm6-r5xr, CVE-2026-96889,
 * GHSA-p3m5-59mp-jv5r); sharp 0.35.5 — the CVE-2026-96889 workaround.
 */
const FLOORS: Record<string, string> = { next: "16.4.1", sharp: "0.35.5" };

function atLeast(version: string, floor: string): boolean {
  const a = version.split(".").map(Number);
  const b = floor.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return true;
}

const lock = JSON.parse(readFileSync("package-lock.json", "utf-8")) as {
  packages: Record<string, { version?: string }>;
};
const pkg = JSON.parse(readFileSync("package.json", "utf-8")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

for (const [name, floor] of Object.entries(FLOORS)) {
  test(`the locked ${name} is at least ${floor}`, () => {
    const locked = lock.packages[`node_modules/${name}`]?.version ?? "0.0.0";
    expect(atLeast(locked, floor), `${name} ${locked}`).toBe(true);
  });
}

test("next, its eslint config and the lockfile name one version", () => {
  const locked = lock.packages["node_modules/next"]?.version;
  expect(pkg.dependencies.next).toBe(locked);
  expect(pkg.devDependencies["eslint-config-next"]).toBe(locked);
});
