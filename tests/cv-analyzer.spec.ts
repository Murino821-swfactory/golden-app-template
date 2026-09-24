import { test, expect } from "@playwright/test";
import { analyzeCv, tierFor, SAMPLES } from "../lib/cv-analyzer";
import { reportToMarkdown } from "../lib/cv-matcher-copy";

/**
 * The matching engine behind OTH-85 — pure functions, no page. Everything runs in the
 * visitor's browser (static export, no API), so this file is the whole of its logic.
 */

const ids = (hits: { skill: { id: string } }[]) => hits.map((h) => h.skill.id).sort();

test.describe("analyzeCv", () => {
  test("returns nothing until both texts are filled in", () => {
    expect(analyzeCv("", "React developer")).toBeNull();
    expect(analyzeCv("I write React", "   \n ")).toBeNull();
  });

  test("matches a skill through its aliases", () => {
    const r = analyzeCv(
      "Built dashboards in ReactJS and TS, APIs in NodeJS.",
      "We need React, TypeScript and Node.js."
    )!;
    expect(ids(r.matched)).toEqual(["nodejs", "react", "typescript"]);
    expect(r.missing).toHaveLength(0);
    expect(r.score).toBe(100);
  });

  test("respects word boundaries — JavaScript is not Java, PostgreSQL is not SQL", () => {
    const r = analyzeCv("Five years of JavaScript and PostgreSQL.", "Java and SQL required.")!;
    expect(ids(r.missing)).toEqual(["java", "sql"]);
    expect(r.matched).toHaveLength(0);
  });

  test("scores matched over required and names the tier", () => {
    const r = analyzeCv("React and TypeScript.", "React, TypeScript, GraphQL, Docker.")!;
    expect(r.score).toBe(50);
    expect(r.tier).toBe("medium");
  });

  test("tiers: high from 70, medium from 40, low below", () => {
    expect(tierFor(70)).toBe("high");
    expect(tierFor(69)).toBe("medium");
    expect(tierFor(40)).toBe("medium");
    expect(tierFor(39)).toBe("low");
  });

  test("a nice-to-have skill is marked preferred and weighs half", () => {
    const job = "Requirements:\n- React\n- TypeScript\n\nNice to have:\n- Docker";
    const r = analyzeCv("React, TypeScript.", job)!;
    const docker = r.missing.find((h) => h.skill.id === "docker")!;
    expect(docker.priority).toBe("preferred");
    expect(r.score).toBe(80); // 2 / (2 + 0.5)
  });

  test("an inline 'is a plus' marks only its own line as preferred", () => {
    const job = "You know Python.\nKubernetes is a plus.";
    const r = analyzeCv("Python", job)!;
    expect(r.missing.find((h) => h.skill.id === "kubernetes")!.priority).toBe("preferred");
    expect(r.matched.find((h) => h.skill.id === "python")!.priority).toBe("required");
  });

  test("reads Slovak postings and CVs, with or without diacritics", () => {
    const r = analyzeCv(
      "Silná komunikacia, práca v tíme, Excel.",
      "Požadujeme: komunikačné zručnosti, tímová práca.\nVýhodou: znalosť Jira."
    )!;
    expect(ids(r.matched)).toEqual(["communication", "teamwork"]);
    const jira = r.missing.find((h) => h.skill.id === "jira")!;
    expect(jira.priority).toBe("preferred");
  });

  test("lists missing required skills before preferred ones, most-mentioned first", () => {
    const job = "Docker, Docker, Docker. AWS. Nice to have: Terraform";
    const r = analyzeCv("Nothing relevant", job)!;
    expect(r.missing.map((h) => h.skill.id)).toEqual(["docker", "aws", "terraform"]);
  });

  test("falls back to keyword overlap when the posting names no known skill", () => {
    const r = analyzeCv(
      "Experienced beekeeper, honey harvesting, hive inspection.",
      "Beekeeper wanted for hive inspection and swarm control."
    )!;
    expect(r.method).toBe("keywords");
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(100);
  });

  test("recommends adding each missing required skill as a keyword", () => {
    const r = analyzeCv("React developer", "React and GraphQL")!;
    const add = r.recommendations.find((x) => x.kind === "add-keyword");
    expect(add && add.kind === "add-keyword" && add.skills.map((s) => s.id)).toEqual(["graphql"]);
  });

  test("asks for numbers when the CV has no measurable outcome", () => {
    const r = analyzeCv("Responsible for React components.", "React")!;
    expect(r.recommendations.some((x) => x.kind === "quantify")).toBe(true);
    const weak = r.recommendations.find((x) => x.kind === "weak-verbs");
    expect(weak && weak.kind === "weak-verbs" && weak.phrases).toContain("responsible for");
  });

  test("stays fast on a 10,000-word CV", () => {
    const cv = "React TypeScript delivered results ".repeat(2_500);
    const started = performance.now();
    analyzeCv(cv, SAMPLES.en[0]!.job);
    expect(performance.now() - started).toBeLessThan(250);
  });
});

test.describe("samples", () => {
  for (const locale of ["en", "sk"] as const) {
    test(`every ${locale} sample shows both lists, so the demo explains itself`, () => {
      expect(SAMPLES[locale].length).toBeGreaterThanOrEqual(3);
      for (const sample of SAMPLES[locale]) {
        const r = analyzeCv(sample.cv, sample.job)!;
        expect(r.method, sample.id).toBe("skills");
        expect(r.matched.length, sample.id).toBeGreaterThan(0);
        expect(r.missing.length, sample.id).toBeGreaterThan(0);
      }
    });
  }
});

test.describe("reportToMarkdown", () => {
  test("carries the score, both lists and the recommendations", () => {
    const r = analyzeCv("React and TypeScript.", "React, TypeScript, GraphQL, Docker.")!;
    const md = reportToMarkdown(r, "en");
    expect(md).toContain("# CV match report");
    expect(md).toContain("50%");
    expect(md).toMatch(/## Matched skills[\s\S]*React/);
    expect(md).toMatch(/## Missing skills[\s\S]*GraphQL/);
    expect(md).toContain("## Recommendations");
  });

  test("is written in Slovak for the Slovak locale", () => {
    const r = analyzeCv("React", "React, Docker")!;
    expect(reportToMarkdown(r, "sk")).toContain("## Chýbajúce zručnosti");
  });
});
