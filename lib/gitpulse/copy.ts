import type { ImageStyle, MusicMood, TextKind } from "./types";

/**
 * copy.ts — every string the creation studio shows, in the prototype's two locales. The
 * studio is branch-specific code, so its copy lives here (the law-expert pattern), not in
 * the template's messages/*.json.
 */

export interface GitpulseCopy {
  dashboardLink: { title: string; hint: string };
  page: { title: string; intro: string; signedCost: string };
  digest: {
    step: string;
    repoLabel: string;
    repoPlaceholder: string;
    load: string;
    loading: string;
    sample: string;
    weekOf: string;
    commits: string;
    pullRequests: string;
    contributors: string;
    languages: string;
    highlights: string;
    errors: { "not-found": string; "rate-limited": string; network: string; "bad-repo": string };
  };
  text: {
    step: string;
    kinds: Record<TextKind, string>;
    instructionsLabel: string;
    instructionsPlaceholder: string;
    generate: string;
    generating: string;
    regenerate: string;
    copy: string;
    copied: string;
    queue: string;
    queued: string;
    cost: string;
  };
  image: {
    step: string;
    styles: Record<ImageStyle, string>;
    aspectLabel: string;
    generate: string;
    generating: string;
    download: string;
    alt: string;
  };
  voice: {
    step: string;
    scriptLabel: string;
    scriptHint: string;
    voiceLabel: string;
    generate: string;
    generating: string;
    useInVideo: string;
    seconds: string;
  };
  music: {
    step: string;
    moods: Record<MusicMood, string>;
    generate: string;
    generating: string;
    note: string;
    useInVideo: string;
  };
  video: {
    step: string;
    note: string;
    withVoiceover: string;
    withMusic: string;
    headlineLabel: string;
  };
  assistant: {
    title: string;
    hint: string;
    placeholder: string;
    send: string;
    thinking: string;
    micStart: string;
    micStop: string;
    micUnavailable: string;
    speakReplies: string;
  };
  publish: {
    title: string;
    empty: string;
    statuses: { draft: string; review: string; published: string };
    open: string;
    copyOpen: string;
    copyOpenNote: string;
    markPublished: string;
    remove: string;
    intentNote: string;
    /** The direct route (founder): a real post on @tokenwisefactory. */
    direct: (handle: string) => string;
    directButton: (label: string) => string;
    publishing: string;
    published: string;
    view: string;
    needImage: string;
    aspect: string;
    metaRefused: (message: string) => string;
  };
  errors: {
    auth: string;
    forbidden: string;
    invalid: string;
    "quota-user": string;
    "quota-global": string;
    rate: string;
    model: string;
    internal: string;
    network: string;
  };
}

const en: GitpulseCopy = {
  dashboardLink: {
    title: "Create this week's content",
    hint: "Generate the blog post, social captions, a visual, a voiceover and the recap video from your repository's week.",
  },
  page: {
    title: "Creation studio",
    intro: "Load a public repository's week, then let the studio write, draw, speak and cut it into publishable content.",
    signedCost: "Generation runs on real models with daily limits; each result shows what it cost.",
  },
  digest: {
    step: "1 · The week",
    repoLabel: "Public GitHub repository",
    repoPlaceholder: "owner/repository",
    load: "Load this week",
    loading: "Reading GitHub…",
    sample: "Use sample week",
    weekOf: "Week of",
    commits: "commits",
    pullRequests: "merged PRs",
    contributors: "contributors",
    languages: "Languages",
    highlights: "Highlights",
    errors: {
      "not-found": "That repository doesn't exist or isn't public.",
      "rate-limited": "GitHub's anonymous limit is used up — try again in a while or use the sample week.",
      network: "GitHub didn't answer. Check the connection or use the sample week.",
      "bad-repo": "Write it as owner/repository.",
    },
  },
  text: {
    step: "2 · Words",
    kinds: {
      blog: "Blog post",
      linkedin: "LinkedIn",
      x: "X",
      instagram: "Instagram",
      facebook: "Facebook",
      tiktok: "TikTok",
      youtube: "YouTube",
      "video-script": "Voiceover script",
    },
    instructionsLabel: "Extra instructions (optional)",
    instructionsPlaceholder: "e.g. mention the beta signup",
    generate: "Generate",
    generating: "Writing…",
    regenerate: "Regenerate",
    copy: "Copy",
    copied: "Copied",
    queue: "Add to queue",
    queued: "In queue",
    cost: "cost",
  },
  image: {
    step: "3 · Visual",
    styles: { "abstract-tech": "Abstract tech", gradient: "Gradient", editorial: "Editorial", neon: "Neon" },
    aspectLabel: "Format",
    generate: "Generate visual",
    generating: "Drawing…",
    download: "Download",
    alt: "Generated weekly visual",
  },
  voice: {
    step: "4 · Voiceover",
    scriptLabel: "Script",
    scriptHint: "Generate the “Voiceover script” in step 2, or write your own.",
    voiceLabel: "Voice",
    generate: "Generate voiceover",
    generating: "Speaking…",
    useInVideo: "Use in the video",
    seconds: "s",
  },
  music: {
    step: "5 · Music",
    moods: { calm: "Calm", upbeat: "Upbeat", epic: "Epic" },
    generate: "Generate soundtrack",
    generating: "Composing…",
    note: "Composed in your browser from this week's data — free, and the same week always sounds the same.",
    useInVideo: "Use in the video",
  },
  video: {
    step: "6 · Recap video",
    note: "Rendered live by Remotion from the digest — what you hear is the voiceover and soundtrack you generated.",
    withVoiceover: "voiceover on",
    withMusic: "music on",
    headlineLabel: "Video headline",
  },
  assistant: {
    title: "Studio assistant",
    hint: "Ask what shipped this week or what to generate next.",
    placeholder: "Ask the studio…",
    send: "Send",
    thinking: "Thinking…",
    micStart: "Speak",
    micStop: "Stop",
    micUnavailable: "Voice input isn't available in this browser — type instead, replies can still be read aloud.",
    speakReplies: "Read replies aloud",
  },
  publish: {
    title: "Publish queue",
    empty: "Nothing queued yet — generate content in step 2 and add it here.",
    statuses: { draft: "Draft", review: "In review", published: "Published" },
    open: "Open composer",
    copyOpen: "Copy & open",
    copyOpenNote: "This platform has no prefillable web composer — the caption is copied, paste it there.",
    markPublished: "Mark published",
    remove: "Remove",
    intentNote: "Publishing opens your own account's composer with the text prefilled — the demo stores no social credentials.",
    direct: (handle) => `You are signed in as the founder — this posts straight to ${handle}.`,
    directButton: (label) => `Post on ${label}`,
    publishing: "Posting…",
    published: "Posted.",
    view: "Open the post",
    needImage: "Generate the visual in step 3 first — a post needs an image.",
    aspect: "Instagram takes 1:1, 4:5 or 16:9 — regenerate the image in one of those.",
    metaRefused: (message) => `Meta refused the post: ${message}`,
  },
  errors: {
    auth: "Sign in to generate.",
    forbidden: "Only the founder can post directly — use the share route.",
    invalid: "That input didn't pass validation.",
    "quota-user": "You've used today's limit for this — it resets at midnight UTC.",
    "quota-global": "The demo's daily budget for this is spent — try tomorrow.",
    rate: "Too fast — give it a few seconds.",
    model: "The model didn't deliver this time. Try again.",
    internal: "Something broke on our side. Try again.",
    network: "No connection to the studio API.",
  },
};

const cs: GitpulseCopy = {
  dashboardLink: {
    title: "Vytvořit obsah tohoto týdne",
    hint: "Vygenerujte blog, texty na sítě, vizuál, voiceover a rekapitulační video z týdne vašeho repozitáře.",
  },
  page: {
    title: "Tvůrčí studio",
    intro: "Načtěte týden veřejného repozitáře a nechte studio psát, kreslit, mluvit a stříhat obsah připravený k publikování.",
    signedCost: "Generování běží na skutečných modelech s denními limity; u každého výsledku vidíte, kolik stál.",
  },
  digest: {
    step: "1 · Týden",
    repoLabel: "Veřejný GitHub repozitář",
    repoPlaceholder: "vlastník/repozitář",
    load: "Načíst tento týden",
    loading: "Čtu GitHub…",
    sample: "Použít ukázkový týden",
    weekOf: "Týden od",
    commits: "commitů",
    pullRequests: "mergnutých PR",
    contributors: "přispěvatelů",
    languages: "Jazyky",
    highlights: "Události týdne",
    errors: {
      "not-found": "Takový repozitář neexistuje nebo není veřejný.",
      "rate-limited": "Anonymní limit GitHubu je vyčerpaný — zkuste to za chvíli, nebo použijte ukázkový týden.",
      network: "GitHub neodpověděl. Zkontrolujte připojení, nebo použijte ukázkový týden.",
      "bad-repo": "Zapište ho jako vlastník/repozitář.",
    },
  },
  text: {
    step: "2 · Slova",
    kinds: {
      blog: "Blogový článek",
      linkedin: "LinkedIn",
      x: "X",
      instagram: "Instagram",
      facebook: "Facebook",
      tiktok: "TikTok",
      youtube: "YouTube",
      "video-script": "Scénář voiceoveru",
    },
    instructionsLabel: "Doplňující pokyny (volitelné)",
    instructionsPlaceholder: "např. zmiňte beta registraci",
    generate: "Vygenerovat",
    generating: "Píšu…",
    regenerate: "Vygenerovat znovu",
    copy: "Kopírovat",
    copied: "Zkopírováno",
    queue: "Přidat do fronty",
    queued: "Ve frontě",
    cost: "cena",
  },
  image: {
    step: "3 · Vizuál",
    styles: { "abstract-tech": "Abstraktní tech", gradient: "Gradient", editorial: "Editorial", neon: "Neon" },
    aspectLabel: "Formát",
    generate: "Vygenerovat vizuál",
    generating: "Kreslím…",
    download: "Stáhnout",
    alt: "Vygenerovaný týdenní vizuál",
  },
  voice: {
    step: "4 · Voiceover",
    scriptLabel: "Scénář",
    scriptHint: "Vygenerujte si „Scénář voiceoveru“ v kroku 2, nebo napište vlastní.",
    voiceLabel: "Hlas",
    generate: "Vygenerovat voiceover",
    generating: "Mluvím…",
    useInVideo: "Použít ve videu",
    seconds: "s",
  },
  music: {
    step: "5 · Hudba",
    moods: { calm: "Klidná", upbeat: "Svižná", epic: "Epická" },
    generate: "Vygenerovat soundtrack",
    generating: "Skládám…",
    note: "Složeno ve vašem prohlížeči z dat tohoto týdne — zdarma, a stejný týden zní vždy stejně.",
    useInVideo: "Použít ve videu",
  },
  video: {
    step: "6 · Rekapitulační video",
    note: "Renderuje živě Remotion přímo z digestu — slyšíte voiceover a soundtrack, které jste si vygenerovali.",
    withVoiceover: "s voiceoverem",
    withMusic: "s hudbou",
    headlineLabel: "Titulek videa",
  },
  assistant: {
    title: "Asistent studia",
    hint: "Zeptejte se, co se tento týden stalo, nebo co vygenerovat dál.",
    placeholder: "Zeptejte se studia…",
    send: "Odeslat",
    thinking: "Přemýšlím…",
    micStart: "Mluvit",
    micStop: "Stop",
    micUnavailable: "Hlasový vstup v tomto prohlížeči není dostupný — pište, odpovědi se dají přečíst nahlas.",
    speakReplies: "Číst odpovědi nahlas",
  },
  publish: {
    title: "Fronta k publikování",
    empty: "Zatím nic — vygenerujte obsah v kroku 2 a přidejte ho sem.",
    statuses: { draft: "Koncept", review: "Ke kontrole", published: "Publikováno" },
    open: "Otevřít editor",
    copyOpen: "Zkopírovat a otevřít",
    copyOpenNote: "Tahle platforma nemá předvyplnitelný webový editor — text se zkopíruje, vložte ho tam.",
    markPublished: "Označit jako publikované",
    remove: "Odebrat",
    intentNote: "Publikování otevře editor vašeho vlastního účtu s předvyplněným textem — demo neukládá žádné přihlašovací údaje k sítím.",
    direct: (handle) => `Jste přihlášen jako zakladatel — tohle zveřejní rovnou na ${handle}.`,
    directButton: (label) => `Zveřejnit na ${label}`,
    publishing: "Zveřejňuji…",
    published: "Zveřejněno.",
    view: "Otevřít příspěvek",
    needImage: "Nejdřív vygenerujte vizuál v kroku 3 — příspěvek potřebuje obrázek.",
    aspect: "Instagram bere 1:1, 4:5 nebo 16:9 — vygenerujte obrázek v jednom z nich.",
    metaRefused: (message) => `Meta příspěvek odmítla: ${message}`,
  },
  errors: {
    auth: "Pro generování se přihlaste.",
    forbidden: "Přímo zveřejňovat může jen zakladatel — použijte sdílení.",
    invalid: "Tenhle vstup neprošel validací.",
    "quota-user": "Dnešní limit pro tuhle akci jste vyčerpali — obnoví se o půlnoci UTC.",
    "quota-global": "Denní rozpočet dema pro tuhle akci je vyčerpaný — zkuste to zítra.",
    rate: "Příliš rychle — dejte tomu pár vteřin.",
    model: "Model tentokrát nedodal výsledek. Zkuste to znovu.",
    internal: "Něco se pokazilo u nás. Zkuste to znovu.",
    network: "Studio API není dostupné.",
  },
};

export function gitpulseCopy(locale: string): GitpulseCopy {
  return locale === "cs" ? cs : en;
}
