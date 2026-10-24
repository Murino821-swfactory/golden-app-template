/**
 * copy.ts — the presentational words of the GitPulse Studio landing, English (default) and
 * Czech: eyebrow pills, the manifesto and the labels inside the studio preview. The customer's copy — headline, features, steps, FAQ, closing band —
 * stays in `prototype.config.json`, where the copy rewrite and the production gate read
 * it; this file holds only what that contract has no slot for. Czech is typed against
 * English, so a word added to one is a type error until the other has it.
 *
 * Demo-branch only (`demo/gitpulse-studio`), like `lib/studio/copy.ts`.
 */

export type LandingLocale = "en" | "cs";

export function landingLocale(locale: string): LandingLocale {
  return locale === "cs" ? "cs" : "en";
}

const EN = {
  hero: {
    eyebrow: "Your week in git, ready to post",
    previewLabel: "The studio: this week's stories and the five destinations",
  },
  preview: {
    record: "The factory's record",
    commits: "commits",
    days: "days",
    eras: "eras",
    projects: "Live projects",
    publishTo: "Publish to",
    caption: "Caption",
    ready: "Ready",
  },
  features: { eyebrow: "What you get" },
  gallery: {
    kicker: "Live projects",
    title: (shown: number, total: number) => `${shown} of the ${total} apps the factory runs in production`,
  },
  manifesto: {
    kicker: "The manifesto",
    lead: "GitPulse Studio is a publishing desk, not another scheduler.",
    body:
      "Every post starts from something you can check — a live project list, a public git history, a game you just played — never from an invented customer or a made-up number.",
  },
  howItWorks: { eyebrow: "How it works" },
  faq: { eyebrow: "Questions" },
  cta: { eyebrow: "No sign-in needed" },
};

const CS: typeof EN = {
  hero: {
    eyebrow: "Váš týden v gitu, připravený k publikování",
    previewLabel: "Studio: příběhy tohoto týdne a pět cílů",
  },
  preview: {
    record: "Záznam továrny",
    commits: "commitů",
    days: "dní",
    eras: "ér",
    projects: "Živé projekty",
    publishTo: "Publikovat na",
    caption: "Popisek",
    ready: "Připraveno",
  },
  features: { eyebrow: "Co získáte" },
  gallery: {
    kicker: "Živé projekty",
    title: (shown: number, total: number) => `${shown} z ${total} aplikací, které továrna provozuje v produkci`,
  },
  manifesto: {
    kicker: "Manifest",
    lead: "GitPulse Studio je publikační stůl, ne další plánovač.",
    body:
      "Každý příspěvek vychází z něčeho, co si můžete ověřit — ze seznamu živých projektů, z veřejné git historie, ze hry, kterou jste právě dohráli — nikdy z vymyšleného zákazníka nebo smyšleného čísla.",
  },
  howItWorks: { eyebrow: "Jak to funguje" },
  faq: { eyebrow: "Otázky" },
  cta: { eyebrow: "Bez přihlášení" },
};

export type LandingCopy = typeof EN;

export const LANDING_COPY: Record<LandingLocale, LandingCopy> = { en: EN, cs: CS };

export function landingCopy(locale: string): LandingCopy {
  return LANDING_COPY[landingLocale(locale)];
}
