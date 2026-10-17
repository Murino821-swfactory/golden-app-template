/**
 * copy.ts — every word the growth plan shows, English (default) and Czech. One object per
 * language, the Czech one typed against the English one (the studio's pattern), so a
 * string added to one is a type error until the other has it.
 *
 * The content itself — the idea bank, the bio variants, the highlights, the e-mails — is
 * the improvement plan of 2026-10-17 for tokenwise.sk and @tokenwisefactory, written out.
 * Claims stay within what the factory can show: live projects, the git record, token
 * prices on screen. No customer reviews are invented (there are none to quote yet).
 */
import type { ChannelId, ContentKind, StudioLocale } from "@/lib/studio/channels";

export type Pillar = "educational" | "brand" | "value" | "proof";
export type LeadSource = "contact" | "newsletter" | "account";
export type StepKind = "welcome" | "value" | "offer" | "reminder";

export interface IdeaCopy {
  hook: string;
  summary: string;
  beats: string[];
}

export interface HighlightCopy {
  /** Instagram shows at most 15 characters under a highlight cover. */
  title: string;
  purpose: string;
  stories: string[];
}

export interface EmailCopy {
  subject: (name: string) => string;
  body: (name: string, link: string, coupon: string) => string;
}

const EN = {
  kicker: "GitPulse Studio",
  title: "Growth plan",
  intro:
    "The improvement plan for tokenwise.sk and its profiles as a working tool: a weekly content plan, the Instagram profile kit, a weekly report computed from what went out, and the leads with their e-mails — every piece ready for the publish bar.",
  goal: "Main goal: make the site trustworthy.",
  tabs: { plan: "Content plan", profile: "Instagram profile", report: "Weekly report", leads: "Leads & offers" },
  pillars: { educational: "Educational", brand: "About Tokenwise", value: "Free value", proof: "Proof" } as Record<Pillar, string>,
  kinds: { post: "Post", story: "Story", reel: "Reel", video: "Video", article: "Article" } as Record<ContentKind, string>,
  channels: { site: "tokenwise.sk", facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube" } as Record<ChannelId, string>,
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  productLine: "Built with Tokenwise — the AI software factory where a human approves every release.",
  plan: {
    heading: "This week's plan",
    intro:
      "Seven slots a week — AI video and real footage, educational posts, something about Tokenwise, free value and proof — rotating through the idea bank so no two weeks repeat. Every caption names the product and links to the site.",
    week: (start: string) => `Week of ${start}`,
    prevWeek: "Previous week",
    nextWeek: "Next week",
    thisWeek: "This week",
    daily: "Every day: one story that points to tokenwise.sk.",
    pick: "Open in the publish bar",
    picked: "In the publish bar",
    done: "Published",
    todo: "To do",
    progress: (done: number, total: number) => `${done} of ${total} slots published this week`,
    ideaBank: "Idea bank",
    ideaBankIntro: "Every idea by pillar. Any of them can go to the publish bar; the week above is only the suggested order.",
    recommended: "Suggested for",
    captionRule: "Rule from the plan: every caption ends with the product and the link.",
    couponLine: (code: string) => `Code ${code} — tokens for your first prototype.`,
    couponMissing: "Set a coupon code under Leads & offers and it appears here.",
    hashtags: ["#tokenwise", "#softwarefactory", "#buildinpublic", "#aiagents"],
    ideas: {
      "who-we-are": {
        hook: "Who we are, what we do, and how you can do the same",
        summary: "Tokenwise is a software factory: AI agents plan, build, review, test and deploy, and a human founder approves every production release.",
        beats: ["Every app on tokenwise.sk/projects came off this one line", "You describe the idea in plain language, the factory builds the first version", "The cost is shown in tokens before you pay", "Start from any live project, or from scratch"],
      },
      "shopify-site": {
        hook: "A website for a Shopify store, built in one afternoon",
        summary: "A brief in plain language, a landing page with the catalogue and the checkout links, reviewed on a phone and approved — the whole afternoon on screen.",
        beats: ["0:00 the brief, three sentences", "0:10 the factory drafts the landing and the catalogue", "0:20 review on the phone, one change, approve", "0:28 live — and what it cost in tokens"],
      },
      "build-use-result": {
        hook: "We built an app, used it for a real job, and here is the result",
        summary: "One video, three acts: the brief, the build as a time-lapse of the pipeline, and the app doing real work — then the outcome in numbers and in tokens.",
        beats: ["Act 1 — the brief and why it was needed", "Act 2 — the pipeline from Analyst to Deploy, sped up", "Act 3 — the app in use, a real task", "The result: what it did, what it cost, how to get yours"],
      },
      efficiency: {
        hook: "How a software factory makes your week shorter",
        summary: "Intake from your phone, agents that run while you sleep, a review and a security audit on every change — you approve, the factory deploys.",
        beats: ["Requests go into Linear from a phone", "The pipeline runs in the night: Analyst → Developer → Reviewer → Security → Tester", "Every change is reviewed and audited before you see it", "You approve the release; nothing goes to production without you"],
      },
      "services-summary": {
        hook: "Everything Tokenwise does, on one card",
        summary: "A prototype in a day, a full app with sign-in, payments and an admin, weekly content from your git history, hosting and CI/CD included.",
        beats: ["Prototype in a day, from a wizard", "Full app: Google sign-in, payments, data grid, admin", "Weekly content from your commits (that is this studio)", "Hosting, CI/CD, monitoring and the monthly security audit"],
      },
      "ai-agents": {
        hook: "Meet the AI agents",
        summary: "Eight roles, one pipeline: the Analyst reads the request, the Developer writes the code, the Reviewer and the Security Auditor check it, the Tester runs the suite — and the deploy waits for a human.",
        beats: ["Analyst — turns the request into a spec", "Developer — writes the code on a feature branch", "Code Reviewer + Security Auditor — every change, no exceptions", "Tester + Deploy — the suite runs, a human approves"],
      },
      "how-to-register": {
        hook: "How to start in 60 seconds",
        summary: "Open tokenwise.sk, sign in with Google, describe the idea in the wizard, and watch the first version build.",
        beats: ["1 — open tokenwise.sk", "2 — sign in with Google", "3 — describe the idea in the wizard", "4 — watch the prototype build, cost on screen"],
      },
      "daily-ops": {
        hook: "A day in the factory",
        summary: "Morning: the queue. Noon: a review on the phone. Evening: a release approved. Night: the daily improvement run.",
        beats: ["08:00 — the queue in Linear, triaged", "12:00 — a code review on a phone", "18:00 — the founder approves a release", "05:00 — the daily improvement agent reports"],
      },
      "free-checklist": {
        hook: "Free: the checklist every app passes before anyone sees it",
        summary: "Four checks we run on every app the factory ships — use them on yours.",
        beats: ["Dark-only and mobile-first, every screen", "SEO + answer-engine metadata, so people and AI find it", "English and a second language from day one", "App-store ready: manifest, icons, offline shell"],
      },
      "repurpose-youtube": {
        hook: "From the YouTube build log: the 30 seconds that matter",
        summary: "Take one moment from the long build video, caption it with the product and the link, post the same clip on Reels and TikTok, link the full video.",
        beats: ["Pick the moment the app first runs", "Vertical crop, 30 seconds, captions burned in", "Caption: the product, the link, one question", "Link the full build video in the comments"],
      },
      "origin-story": {
        hook: "How Tokenwise started",
        summary: "One founder, one VM and one question: can a factory build software? Fifteen eras and over a thousand commits later, the founder still approves every release.",
        beats: ["Era I — the harness, 49 commits", "The pipeline, the agents, the first prototype", "Era XV — 179 commits, the busiest stretch", "Today: live projects, token prices on screen"],
      },
      "proof-projects": {
        hook: "Live projects, built by one software factory",
        summary: "The proof is the list: every app on tokenwise.sk/projects runs in production on one shared stack. Post the list, name the newest, invite people to try them.",
        beats: ["Open the studio → Live projects for the current list", "Name the newest project and its owner", "Every one of them is a link people can open now", "Ask which one they would build next"],
      },
      "faq-story": {
        hook: "Your questions, answered",
        summary: "Four questions people ask before trying the factory, one story each.",
        beats: ["Do I need to code? No — the brief is plain language", "What does it cost? Tokens, shown before you pay", "Who owns the code? You do — the repository is yours", "How fast? A prototype today"],
      },
      "weekly-recap": {
        hook: "This week in the factory",
        summary: "The git record for the week: commits, the busiest day, what shipped. Build in public, every Sunday.",
        beats: ["Open the studio → Git history for the numbers", "Three things that shipped, one line each", "One thing that did not work, and the lesson", "What is planned for next week"],
      },
      "token-offer": {
        hook: "Tokens for your first prototype",
        summary: "A promo for new accounts: a token coupon applied at the checkout, the cost of the first prototype shown before it runs.",
        beats: ["Sign in with Google at tokenwise.sk", "Describe the idea in the wizard", "Enter the code at the checkout", "Watch the prototype build"],
      },
    } as Record<string, IdeaCopy>,
  },
  profile: {
    heading: "Instagram profile kit",
    intro: "Bio, name, highlights and the fresh-start checklist for @tokenwisefactory. Copy what you need; a highlight opens in the publish bar as a story.",
    handle: "@tokenwisefactory",
    nameLabel: "Name",
    name: "Tokenwise · AI Software Factory",
    bioLabel: "Bio",
    bioLimit: (n: number, max: number) => `${n} / ${max}`,
    bios: [
      "AI software factory. Describe an idea, get a working app. Cost in tokens, shown before you pay. A human approves every release ↓",
      "Live apps built by AI agents, released by a human. See them at tokenwise.sk/projects ↓",
      "Your idea → prototype today → app this week. Git history turned into content every Sunday. tokenwise.sk",
    ],
    copy: "Copy",
    copied: "Copied",
    highlightsHeading: "Story highlights",
    highlightsIntro: "Five covers in this order. Each one is a three-story set; open it in the publish bar as a story.",
    openAsStory: "Open as a story",
    highlights: {
      apps: { title: "Apps", purpose: "The live projects — the proof, first.", stories: ["The current list from tokenwise.sk/projects", "The newest project and its owner", "One app, one screen, one link"] },
      results: { title: "Results", purpose: "What the factory delivers, in numbers.", stories: ["Commits this week, from the git history", "A prototype's cost in tokens, on screen", "Before / after: the brief and the live app"] },
      about: { title: "About", purpose: "How Tokenwise started and what it is for.", stories: ["One founder, one VM, one question", "Fifteen eras of the git record", "A human approves every release"] },
      faq: { title: "FAQ", purpose: "The four questions people ask before trying it.", stories: ["Do I need to code? No", "What does it cost? Tokens, shown before you pay", "Who owns the code? You"] },
      start: { title: "Start", purpose: "How to register, and the AI agents at work.", stories: ["Sign in with Google at tokenwise.sk", "Describe the idea in the wizard", "Watch the agents build it"] },
    } as Record<string, HighlightCopy>,
    checklistHeading: "Fresh start",
    checklistIntro: "In this order. The ticks stay in this browser.",
    checklist: {
      bio: "Replace the bio with one of the three above",
      name: "Set the name to \"Tokenwise · AI Software Factory\"",
      logo: "New logo — generate a square visual in the creation studio, crop to a circle",
      archive: "Archive every old post (archive, not delete — the history stays)",
      "post-who": "Post 1 — who we are",
      "post-what": "Post 2 — what we do",
      "post-how": "Post 3 — how you can do the same",
      highlights: "Create the five highlights in the order above",
      friends: "Ask ten friends to share the first three posts",
      follow: "Follow fifty accounts in the niche (follow for follow)",
      daily: "Post daily for fourteen days on Instagram, Facebook and TikTok",
    } as Record<string, string>,
    strategyHeading: "Strategy",
    strategy: [
      "Follow for follow, and ask people you know to share.",
      "Post on Instagram, Facebook and TikTok every day; the same clip goes to all three.",
      "Rework the YouTube videos into Reels and TikToks; the long video stays as the link.",
      "Every change goes to the site too, as SEO content — the tokenwise.sk channel in the bar.",
    ],
  },
  report: {
    heading: "Weekly report",
    intro: "Computed from this browser's publish log and the numbers you type in — the same report every Monday, no tokens spent.",
    range: (start: string, end: string) => `${start} – ${end}`,
    produced: "Content produced",
    byChannel: "By channel",
    metricsHeading: "This week's numbers",
    metricsIntro: "From the networks' insights and the site. They stay in this browser.",
    reach: "People reached",
    followers: "Followers",
    visits: "Site visits",
    registrations: "Registrations",
    vsLast: (delta: number) => (delta >= 0 ? `+${delta} vs last week` : `${delta} vs last week`),
    noLast: "no previous week",
    goalsHeading: "Goals",
    weeklyGoals: "Next week",
    monthlyGoal: "This month",
    goalPieces: "pieces published",
    goalReach: "people reached",
    goalRegistrations: "registrations",
    goalFollowers: "followers",
    met: "met",
    notMet: "not yet",
    suggestion: "Suggested for next week",
    applySuggestion: "Use the suggestion",
    download: "Download as Markdown",
    publishHint: "The report is in the publish bar too — a weekly build-in-public post.",
    empty: "Nothing published this week yet — the content plan is where to start.",
    articleTitle: (start: string) => `Week of ${start} at the factory: what went out`,
    articleSummary: (total: number, reach: number, registrations: number) =>
      `${total} pieces of content published, ${reach} people reached, ${registrations} registrations.`,
    lineProduced: (kind: string, n: number) => `${n} × ${kind}`,
    lineGoal: (label: string, have: number, goal: number) => `${label}: ${have} / ${goal}`,
    mdProduced: "Content produced",
    mdNumbers: "Numbers",
    mdGoals: "Goals for next week",
    mdMonthly: "Monthly goal",
    hashtags: ["#tokenwise", "#buildinpublic", "#weeklyreport"],
  },
  leads: {
    heading: "Leads & offers",
    intro:
      "Everyone who contacts you, ticks the newsletter or opens an account gets a short sequence: a welcome, one e-mail with real value, an offer, a reminder. Due steps are listed here; each opens in your mail client, ready to send.",
    add: "Add a lead",
    name: "Name",
    email: "E-mail",
    source: "Source",
    sources: { contact: "Contacted us", newsletter: "Newsletter", account: "Has an account" } as Record<LeadSource, string>,
    save: "Save",
    invalid: "Type a name and a valid e-mail.",
    list: "Leads",
    empty: "No leads yet.",
    remove: "Remove",
    due: "Due now",
    upcoming: "Next",
    dueIn: (days: number) => (days === 0 ? "today" : days < 0 ? `${-days} days overdue` : `in ${days} days`),
    send: "Open e-mail",
    markSent: "Mark sent",
    sent: "Sent",
    nothingDue: "Nothing due — the sequences are on time.",
    stepKinds: { welcome: "Welcome", value: "Value e-mail", offer: "Offer", reminder: "Reminder" } as Record<StepKind, string>,
    couponLabel: "Token coupon code",
    couponHint: "Used in the offer e-mail and the promo post. Create the code in Stripe first; left empty, the e-mail invites to the wizard instead.",
    summary: (total: number, due: number) => `${total} leads · ${due} due`,
    emails: {
      welcome: {
        subject: (name: string) => `Welcome to Tokenwise, ${name}`,
        body: (name: string, link: string) =>
          `Hi ${name},\n\nthanks for getting in touch with Tokenwise. Here is what to expect from us: one short e-mail a week with something you can use right away, and nothing else.\n\nTo see what the factory builds, open the live projects: ${link}projects\n\nTokenwise`,
      },
      value: {
        subject: () => "One checklist that saves a week of rework",
        body: (name: string, link: string) =>
          `Hi ${name},\n\nevery app that leaves our factory passes the same four checks before anyone sees it: dark-only and mobile-first; SEO plus answer-engine metadata; English and a second language from day one; app-store ready.\n\nRun your own idea through the same line: ${link}\n\nTokenwise`,
      },
      offer: {
        subject: () => "Tokens for your first prototype",
        body: (name: string, link: string, coupon: string) =>
          `Hi ${name},\n\n${
            coupon
              ? `use the code ${coupon} at the checkout and the tokens are credited to your account — enough for the first prototype.`
              : "sign in, describe the idea in the wizard and watch the first version build; the cost is shown in tokens before you pay."
          }\n\nStart here: ${link}\n\nTokenwise`,
      },
      reminder: {
        subject: () => "Your prototype is waiting",
        body: (name: string, link: string) =>
          `Hi ${name},\n\nyour account on Tokenwise is ready and the wizard takes two minutes: describe the idea, pick a name, and the factory builds the first version while you watch.\n\nContinue here: ${link}\n\nTokenwise`,
      },
    } as Record<StepKind, EmailCopy>,
  },
  dashboard: { link: "Open the growth plan", hint: "Content plan, Instagram kit, weekly report and leads — the improvement plan as a tool." },
};

export type GrowthCopy = typeof EN;

const CS: GrowthCopy = {
  kicker: "GitPulse Studio",
  title: "Plán růstu",
  intro:
    "Plán zlepšení pro tokenwise.sk a jeho profily jako pracovní nástroj: týdenní plán obsahu, sada pro instagramový profil, týdenní report spočítaný z toho, co vyšlo, a leady s jejich e-maily — každý kus připravený pro publikační lištu.",
  goal: "Hlavní cíl: udělat web důvěryhodný.",
  tabs: { plan: "Plán obsahu", profile: "Instagramový profil", report: "Týdenní report", leads: "Leady a nabídky" },
  pillars: { educational: "Vzdělávací", brand: "O Tokenwise", value: "Hodnota zdarma", proof: "Důkaz" },
  kinds: { post: "Příspěvek", story: "Story", reel: "Reel", video: "Video", article: "Článek" },
  channels: { site: "tokenwise.sk", facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube" },
  days: ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"],
  productLine: "Vytvořeno s Tokenwise — AI softwarovou továrnou, kde každé vydání schvaluje člověk.",
  plan: {
    heading: "Plán na tento týden",
    intro:
      "Sedm slotů týdně — AI video i reálné záběry, vzdělávací příspěvky, něco o Tokenwise, hodnota zdarma a důkaz — v rotaci přes zásobník nápadů, takže se žádné dva týdny neopakují. Každý popisek jmenuje produkt a odkazuje na web.",
    week: (start: string) => `Týden od ${start}`,
    prevWeek: "Předchozí týden",
    nextWeek: "Další týden",
    thisWeek: "Tento týden",
    daily: "Každý den: jedna story, která míří na tokenwise.sk.",
    pick: "Otevřít v publikační liště",
    picked: "V publikační liště",
    done: "Publikováno",
    todo: "Čeká",
    progress: (done: number, total: number) => `${done} ze ${total} slotů tento týden publikováno`,
    ideaBank: "Zásobník nápadů",
    ideaBankIntro: "Všechny nápady podle pilíře. Kterýkoli může do publikační lišty; týden výše je jen doporučené pořadí.",
    recommended: "Doporučeno pro",
    captionRule: "Pravidlo z plánu: každý popisek končí produktem a odkazem.",
    couponLine: (code: string) => `Kód ${code} — tokeny na první prototyp.`,
    couponMissing: "Nastavte kód kupónu v Leadech a nabídkách a objeví se zde.",
    hashtags: ["#tokenwise", "#softwarefactory", "#buildinpublic", "#aiagents"],
    ideas: {
      "who-we-are": {
        hook: "Kdo jsme, co děláme a jak to můžete dělat taky",
        summary: "Tokenwise je softwarová továrna: AI agenti plánují, staví, kontrolují, testují a nasazují, a lidský zakladatel schvaluje každé produkční vydání.",
        beats: ["Každá aplikace na tokenwise.sk/projects sjela z této jedné linky", "Nápad popíšete běžnou řečí, továrna postaví první verzi", "Cena je v tokenech vidět dřív, než platíte", "Začněte z libovolného živého projektu, nebo od nuly"],
      },
      "shopify-site": {
        hook: "Web pro Shopify obchod, postavený za jedno odpoledne",
        summary: "Zadání běžnou řečí, landing page s katalogem a odkazy na pokladnu, kontrola na telefonu a schválení — celé odpoledne na obrazovce.",
        beats: ["0:00 zadání, tři věty", "0:10 továrna navrhne landing a katalog", "0:20 kontrola na telefonu, jedna změna, schválit", "0:28 živě — a kolik to stálo v tokenech"],
      },
      "build-use-result": {
        hook: "Postavili jsme aplikaci, použili ji na skutečnou práci a tady je výsledek",
        summary: "Jedno video, tři dějství: zadání, stavba jako časosběr pipeline a aplikace při skutečné práci — pak výsledek v číslech a v tokenech.",
        beats: ["1. dějství — zadání a proč bylo potřeba", "2. dějství — pipeline od Analytika po Deploy, zrychleně", "3. dějství — aplikace v akci, skutečný úkol", "Výsledek: co udělala, co stála, jak získat svou"],
      },
      efficiency: {
        hook: "Jak softwarová továrna zkracuje váš týden",
        summary: "Zadání z telefonu, agenti, kteří běží, zatímco spíte, review a bezpečnostní audit každé změny — vy schválíte, továrna nasadí.",
        beats: ["Požadavky jdou do Linearu z telefonu", "Pipeline běží v noci: Analytik → Vývojář → Reviewer → Security → Tester", "Každá změna je zkontrolovaná a auditovaná dřív, než ji uvidíte", "Vydání schvalujete vy; bez vás nic nejde do produkce"],
      },
      "services-summary": {
        hook: "Všechno, co Tokenwise dělá, na jedné kartě",
        summary: "Prototyp za den, celá aplikace s přihlášením, platbami a adminem, týdenní obsah z git historie, hosting a CI/CD v ceně.",
        beats: ["Prototyp za den, z průvodce", "Celá aplikace: Google přihlášení, platby, datová mřížka, admin", "Týdenní obsah z commitů (to je toto studio)", "Hosting, CI/CD, monitoring a měsíční bezpečnostní audit"],
      },
      "ai-agents": {
        hook: "Seznamte se s AI agenty",
        summary: "Osm rolí, jedna pipeline: Analytik čte požadavek, Vývojář píše kód, Reviewer a Security Auditor ho kontrolují, Tester spouští sadu — a nasazení čeká na člověka.",
        beats: ["Analytik — z požadavku udělá specifikaci", "Vývojář — píše kód na feature větvi", "Code Reviewer + Security Auditor — každá změna, bez výjimky", "Tester + Deploy — sada běží, člověk schvaluje"],
      },
      "how-to-register": {
        hook: "Jak začít za 60 sekund",
        summary: "Otevřete tokenwise.sk, přihlaste se Googlem, popište nápad v průvodci a sledujte, jak vzniká první verze.",
        beats: ["1 — otevřete tokenwise.sk", "2 — přihlaste se Googlem", "3 — popište nápad v průvodci", "4 — sledujte stavbu prototypu, cena na obrazovce"],
      },
      "daily-ops": {
        hook: "Den v továrně",
        summary: "Ráno: fronta. Poledne: review na telefonu. Večer: schválené vydání. Noc: denní zlepšovací běh.",
        beats: ["08:00 — fronta v Linearu, roztříděná", "12:00 — code review na telefonu", "18:00 — zakladatel schvaluje vydání", "05:00 — denní zlepšovací agent reportuje"],
      },
      "free-checklist": {
        hook: "Zdarma: checklist, kterým projde každá aplikace, než ji někdo uvidí",
        summary: "Čtyři kontroly, které děláme u každé aplikace z továrny — použijte je na tu svou.",
        beats: ["Jen tmavý režim a mobile-first, každá obrazovka", "SEO + metadata pro answer enginy, aby ji našli lidé i AI", "Angličtina a druhý jazyk od prvního dne", "Připravená pro app store: manifest, ikony, offline shell"],
      },
      "repurpose-youtube": {
        hook: "Z YouTube build logu: 30 sekund, na kterých záleží",
        summary: "Vezměte jeden moment z dlouhého videa, popište ho produktem a odkazem, stejný klip dejte na Reels i TikTok, odkažte celé video.",
        beats: ["Vyberte moment, kdy aplikace poprvé běží", "Svislý ořez, 30 sekund, vypálené titulky", "Popisek: produkt, odkaz, jedna otázka", "Celé build video odkažte v komentářích"],
      },
      "origin-story": {
        hook: "Jak Tokenwise vzniklo",
        summary: "Jeden zakladatel, jeden VM a jedna otázka: umí továrna stavět software? O patnáct ér a přes tisíc commitů později zakladatel stále schvaluje každé vydání.",
        beats: ["Éra I — harness, 49 commitů", "Pipeline, agenti, první prototyp", "Éra XV — 179 commitů, nejrušnější úsek", "Dnes: živé projekty, ceny v tokenech na obrazovce"],
      },
      "proof-projects": {
        hook: "Živé projekty, postavené jednou softwarovou továrnou",
        summary: "Důkazem je seznam: každá aplikace na tokenwise.sk/projects běží v produkci na jednom sdíleném stacku. Zveřejněte seznam, jmenujte nejnovější, pozvěte lidi, ať je vyzkouší.",
        beats: ["Otevřete studio → Živé projekty pro aktuální seznam", "Jmenujte nejnovější projekt a jeho majitele", "Každý z nich je odkaz, který lze otevřít hned", "Zeptejte se, který by postavili příště"],
      },
      "faq-story": {
        hook: "Vaše otázky, zodpovězené",
        summary: "Čtyři otázky, které lidé kladou, než továrnu vyzkouší, každá jako jedna story.",
        beats: ["Musím umět programovat? Ne — zadání je běžná řeč", "Kolik to stojí? Tokeny, vidíte je před platbou", "Komu patří kód? Vám — repozitář je váš", "Jak rychle? Prototyp dnes"],
      },
      "weekly-recap": {
        hook: "Tento týden v továrně",
        summary: "Git záznam týdne: commity, nejrušnější den, co se vydalo. Build in public, každou neděli.",
        beats: ["Otevřete studio → Git historie pro čísla", "Tři věci, které se vydaly, každá na řádek", "Jedna věc, která nevyšla, a poučení", "Co je v plánu na příští týden"],
      },
      "token-offer": {
        hook: "Tokeny na váš první prototyp",
        summary: "Promo pro nové účty: tokenový kupón uplatněný u pokladny, cena prvního prototypu vidět dřív, než se spustí.",
        beats: ["Přihlaste se Googlem na tokenwise.sk", "Popište nápad v průvodci", "Zadejte kód u pokladny", "Sledujte stavbu prototypu"],
      },
    },
  },
  profile: {
    heading: "Sada pro instagramový profil",
    intro: "Bio, jméno, highlights a checklist nového začátku pro @tokenwisefactory. Zkopírujte, co potřebujete; highlight se otevře v publikační liště jako story.",
    handle: "@tokenwisefactory",
    nameLabel: "Jméno",
    name: "Tokenwise · AI Software Factory",
    bioLabel: "Bio",
    bioLimit: (n: number, max: number) => `${n} / ${max}`,
    bios: [
      "AI softwarová továrna. Popište nápad, dostanete funkční aplikaci. Cena v tokenech vidět před platbou. Každé vydání schvaluje člověk ↓",
      "Živé aplikace postavené AI agenty, vydané člověkem. Podívejte se na tokenwise.sk/projects ↓",
      "Váš nápad → prototyp dnes → aplikace tento týden. Git historie jako obsah každou neděli. tokenwise.sk",
    ],
    copy: "Kopírovat",
    copied: "Zkopírováno",
    highlightsHeading: "Story highlights",
    highlightsIntro: "Pět obálek v tomto pořadí. Každá je sada tří stories; otevřete ji v publikační liště jako story.",
    openAsStory: "Otevřít jako story",
    highlights: {
      apps: { title: "Aplikace", purpose: "Živé projekty — důkaz na prvním místě.", stories: ["Aktuální seznam z tokenwise.sk/projects", "Nejnovější projekt a jeho majitel", "Jedna aplikace, jedna obrazovka, jeden odkaz"] },
      results: { title: "Výsledky", purpose: "Co továrna dodává, v číslech.", stories: ["Commity tohoto týdne z git historie", "Cena prototypu v tokenech, na obrazovce", "Před / po: zadání a živá aplikace"] },
      about: { title: "O nás", purpose: "Jak Tokenwise vzniklo a k čemu je.", stories: ["Jeden zakladatel, jeden VM, jedna otázka", "Patnáct ér git záznamu", "Každé vydání schvaluje člověk"] },
      faq: { title: "FAQ", purpose: "Čtyři otázky, které lidé kladou, než to vyzkouší.", stories: ["Musím umět programovat? Ne", "Kolik to stojí? Tokeny, vidět před platbou", "Komu patří kód? Vám"] },
      start: { title: "Start", purpose: "Jak se zaregistrovat a AI agenti při práci.", stories: ["Přihlaste se Googlem na tokenwise.sk", "Popište nápad v průvodci", "Sledujte, jak to agenti staví"] },
    },
    checklistHeading: "Nový začátek",
    checklistIntro: "V tomto pořadí. Zaškrtnutí zůstávají v tomto prohlížeči.",
    checklist: {
      bio: "Nahradit bio jednou ze tří variant výše",
      name: "Nastavit jméno na „Tokenwise · AI Software Factory“",
      logo: "Nové logo — vygenerovat čtvercový vizuál v tvůrčím studiu, oříznout do kruhu",
      archive: "Archivovat všechny staré příspěvky (archivovat, ne mazat — historie zůstane)",
      "post-who": "Příspěvek 1 — kdo jsme",
      "post-what": "Příspěvek 2 — co děláme",
      "post-how": "Příspěvek 3 — jak to můžete dělat taky",
      highlights: "Vytvořit pět highlights v pořadí výše",
      friends: "Požádat deset známých o sdílení prvních tří příspěvků",
      follow: "Sledovat padesát účtů v oboru (follow for follow)",
      daily: "Čtrnáct dní denně postovat na Instagram, Facebook a TikTok",
    },
    strategyHeading: "Strategie",
    strategy: [
      "Follow for follow a prosba známým o sdílení.",
      "Postovat na Instagram, Facebook a TikTok každý den; stejný klip jde na všechny tři.",
      "Přepracovat YouTube videa do Reels a TikToků; dlouhé video zůstane jako odkaz.",
      "Každá změna jde i na web jako SEO obsah — kanál tokenwise.sk v liště.",
    ],
  },
  report: {
    heading: "Týdenní report",
    intro: "Spočítaný z publikačního logu tohoto prohlížeče a z čísel, která zadáte — stejný report každé pondělí, bez utracených tokenů.",
    range: (start: string, end: string) => `${start} – ${end}`,
    produced: "Vytvořený obsah",
    byChannel: "Podle kanálu",
    metricsHeading: "Čísla tohoto týdne",
    metricsIntro: "Z přehledů sítí a z webu. Zůstávají v tomto prohlížeči.",
    reach: "Oslovení lidé",
    followers: "Sledující",
    visits: "Návštěvy webu",
    registrations: "Registrace",
    vsLast: (delta: number) => (delta >= 0 ? `+${delta} oproti minulému týdnu` : `${delta} oproti minulému týdnu`),
    noLast: "bez minulého týdne",
    goalsHeading: "Cíle",
    weeklyGoals: "Příští týden",
    monthlyGoal: "Tento měsíc",
    goalPieces: "publikovaných kusů",
    goalReach: "oslovených lidí",
    goalRegistrations: "registrací",
    goalFollowers: "sledujících",
    met: "splněno",
    notMet: "zatím ne",
    suggestion: "Návrh na příští týden",
    applySuggestion: "Použít návrh",
    download: "Stáhnout jako Markdown",
    publishHint: "Report je i v publikační liště — týdenní build-in-public příspěvek.",
    empty: "Tento týden zatím nic nevyšlo — začněte v plánu obsahu.",
    articleTitle: (start: string) => `Týden od ${start} v továrně: co vyšlo`,
    articleSummary: (total: number, reach: number, registrations: number) =>
      `${total} kusů obsahu publikováno, ${reach} oslovených lidí, ${registrations} registrací.`,
    lineProduced: (kind: string, n: number) => `${n} × ${kind}`,
    lineGoal: (label: string, have: number, goal: number) => `${label}: ${have} / ${goal}`,
    mdProduced: "Vytvořený obsah",
    mdNumbers: "Čísla",
    mdGoals: "Cíle na příští týden",
    mdMonthly: "Měsíční cíl",
    hashtags: ["#tokenwise", "#buildinpublic", "#weeklyreport"],
  },
  leads: {
    heading: "Leady a nabídky",
    intro:
      "Každý, kdo vás kontaktuje, zaškrtne novinky nebo si založí účet, dostane krátkou sekvenci: uvítání, jeden e-mail se skutečnou hodnotou, nabídku, připomínku. Splatné kroky jsou tady; každý se otevře v poštovním klientovi připravený k odeslání.",
    add: "Přidat lead",
    name: "Jméno",
    email: "E-mail",
    source: "Zdroj",
    sources: { contact: "Kontaktoval nás", newsletter: "Novinky", account: "Má účet" },
    save: "Uložit",
    invalid: "Zadejte jméno a platný e-mail.",
    list: "Leady",
    empty: "Zatím žádné leady.",
    remove: "Odebrat",
    due: "Splatné teď",
    upcoming: "Další",
    dueIn: (days: number) => (days === 0 ? "dnes" : days < 0 ? `${-days} dní po termínu` : `za ${days} dní`),
    send: "Otevřít e-mail",
    markSent: "Označit jako odeslané",
    sent: "Odesláno",
    nothingDue: "Nic není splatné — sekvence jsou v termínu.",
    stepKinds: { welcome: "Uvítání", value: "E-mail s hodnotou", offer: "Nabídka", reminder: "Připomínka" },
    couponLabel: "Kód tokenového kupónu",
    couponHint: "Použije se v e-mailu s nabídkou a v promo příspěvku. Kód nejdřív vytvořte ve Stripe; prázdný kód znamená, že e-mail zve do průvodce.",
    summary: (total: number, due: number) => `${total} leadů · ${due} splatných`,
    emails: {
      welcome: {
        subject: (name: string) => `Vítejte v Tokenwise, ${name}`,
        body: (name: string, link: string) =>
          `Dobrý den, ${name},\n\nděkujeme, že jste se ozvali Tokenwise. Co od nás čekat: jeden krátký e-mail týdně s něčím, co hned použijete, a nic víc.\n\nCo továrna staví, vidíte na živých projektech: ${link}projects\n\nTokenwise`,
      },
      value: {
        subject: () => "Jeden checklist, který ušetří týden předělávek",
        body: (name: string, link: string) =>
          `Dobrý den, ${name},\n\nkaždá aplikace z naší továrny projde čtyřmi kontrolami, než ji někdo uvidí: jen tmavý režim a mobile-first; SEO plus metadata pro answer enginy; angličtina a druhý jazyk od prvního dne; připravenost pro app store.\n\nProžeňte stejnou linkou svůj nápad: ${link}\n\nTokenwise`,
      },
      offer: {
        subject: () => "Tokeny na váš první prototyp",
        body: (name: string, link: string, coupon: string) =>
          `Dobrý den, ${name},\n\n${
            coupon
              ? `zadejte u pokladny kód ${coupon} a tokeny se připíšou na váš účet — stačí na první prototyp.`
              : "přihlaste se, popište nápad v průvodci a sledujte, jak vzniká první verze; cena je v tokenech vidět před platbou."
          }\n\nZačněte zde: ${link}\n\nTokenwise`,
      },
      reminder: {
        subject: () => "Váš prototyp čeká",
        body: (name: string, link: string) =>
          `Dobrý den, ${name},\n\nváš účet na Tokenwise je připravený a průvodce zabere dvě minuty: popište nápad, zvolte jméno a továrna postaví první verzi, zatímco se díváte.\n\nPokračujte zde: ${link}\n\nTokenwise`,
      },
    },
  },
  dashboard: { link: "Otevřít plán růstu", hint: "Plán obsahu, instagramová sada, týdenní report a leady — plán zlepšení jako nástroj." },
};

export const GROWTH_COPY: Record<StudioLocale, GrowthCopy> = { en: EN, cs: CS };

export function growthCopy(locale: string): GrowthCopy {
  return GROWTH_COPY[locale === "cs" ? "cs" : "en"];
}
