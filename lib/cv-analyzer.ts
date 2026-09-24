/**
 * cv-analyzer.ts — scores a CV against a job posting, entirely in the browser.
 *
 * The prototype is a static export with no backend, so the whole analysis is plain string
 * work: find the skills the posting asks for (a curated taxonomy with aliases, English and
 * Slovak), check which the CV shows, weigh must-haves over nice-to-haves, and turn the gaps
 * into concrete advice. No model call, no network — it answers as fast as you type.
 */

export type SkillCategory =
  | "language"
  | "frontend"
  | "backend"
  | "data"
  | "cloud"
  | "testing"
  | "design"
  | "product"
  | "soft"
  | "keyword";

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
}

export type Priority = "required" | "preferred";
export type MatchTier = "high" | "medium" | "low";

export interface SkillHit {
  skill: Skill;
  priority: Priority;
  /** Times the posting names it. */
  jobMentions: number;
  /** Times the CV names it. */
  cvMentions: number;
}

export type Recommendation =
  | { kind: "add-keyword"; skills: Skill[] }
  | { kind: "add-preferred"; skills: Skill[] }
  | { kind: "strengthen"; hits: SkillHit[] }
  | { kind: "mirror-title"; title: string }
  | { kind: "quantify" }
  | { kind: "weak-verbs"; phrases: string[] };

export interface AnalysisResult {
  /** 0–100, rounded. */
  score: number;
  tier: MatchTier;
  /** "keywords" when the posting names no skill the taxonomy knows. */
  method: "skills" | "keywords";
  matched: SkillHit[];
  missing: SkillHit[];
  recommendations: Recommendation[];
}

export interface Sample {
  id: string;
  label: string;
  cv: string;
  job: string;
}

// ── Taxonomy ──────────────────────────────────────────────────────────────────────────
// Aliases are written lowercase and without diacritics, because both texts are normalized
// the same way before matching. An alias that ends in a letter also matches with a Slovak
// case ending ("v Reacte", "s Dockerom", "roadmapou"), so a Slovak CV is not penalised for
// its grammar.

type Entry = [id: string, name: string, category: SkillCategory, aliases: string[]];

const TAXONOMY: Entry[] = [
  ["javascript", "JavaScript", "language", ["javascript", "js", "ecmascript", "es6"]],
  ["typescript", "TypeScript", "language", ["typescript", "ts"]],
  ["python", "Python", "language", ["python"]],
  ["java", "Java", "language", ["java"]],
  ["csharp", "C#", "language", ["c#", "csharp"]],
  ["cpp", "C++", "language", ["c++", "cpp"]],
  ["go", "Go", "language", ["golang"]],
  ["rust", "Rust", "language", ["rust"]],
  ["php", "PHP", "language", ["php"]],
  ["ruby", "Ruby", "language", ["ruby", "ruby on rails", "rails"]],
  ["kotlin", "Kotlin", "language", ["kotlin"]],
  ["sql", "SQL", "language", ["sql"]],
  ["html", "HTML", "language", ["html", "html5"]],
  ["css", "CSS", "language", ["css", "css3"]],

  ["react", "React", "frontend", ["react", "reactjs", "react.js"]],
  ["react-native", "React Native", "frontend", ["react native"]],
  ["nextjs", "Next.js", "frontend", ["next.js", "nextjs"]],
  ["vue", "Vue", "frontend", ["vue", "vue.js", "vuejs"]],
  ["angular", "Angular", "frontend", ["angular", "angularjs"]],
  ["svelte", "Svelte", "frontend", ["svelte", "sveltekit"]],
  ["tailwind", "Tailwind CSS", "frontend", ["tailwind", "tailwindcss"]],
  ["redux", "Redux", "frontend", ["redux"]],
  ["sass", "Sass", "frontend", ["sass", "scss"]],
  ["webpack", "Webpack", "frontend", ["webpack", "vite"]],
  ["accessibility", "Accessibility", "frontend", ["accessibility", "a11y", "wcag", "pristupnost"]],
  [
    "responsive",
    "Responsive design",
    "frontend",
    ["responsive design", "responsive web", "mobile-first", "mobile first", "responzivny dizajn", "responzivn"],
  ],

  ["nodejs", "Node.js", "backend", ["node.js", "nodejs", "node"]],
  ["express", "Express", "backend", ["express.js", "expressjs"]],
  ["nestjs", "NestJS", "backend", ["nestjs", "nest.js"]],
  ["django", "Django", "backend", ["django"]],
  ["flask", "Flask", "backend", ["flask"]],
  ["fastapi", "FastAPI", "backend", ["fastapi"]],
  ["spring", "Spring", "backend", ["spring boot", "spring framework"]],
  ["dotnet", ".NET", "backend", [".net", "dotnet", "asp.net"]],
  ["rest", "REST APIs", "backend", ["rest api", "rest apis", "restful"]],
  ["graphql", "GraphQL", "backend", ["graphql"]],
  [
    "microservices",
    "Microservices",
    "backend",
    ["microservices", "microservice", "mikrosluzby", "mikrosluzieb", "mikrosluzbami", "mikrosluzbach"],
  ],

  ["postgresql", "PostgreSQL", "data", ["postgresql", "postgres"]],
  ["mysql", "MySQL", "data", ["mysql"]],
  ["mongodb", "MongoDB", "data", ["mongodb", "mongo"]],
  ["redis", "Redis", "data", ["redis"]],
  ["elasticsearch", "Elasticsearch", "data", ["elasticsearch", "elastic"]],
  ["kafka", "Kafka", "data", ["kafka"]],
  [
    "data-analysis",
    "Data analysis",
    "data",
    ["data analysis", "data analytics", "analyza dat", "datova analyza", "analyzu dat"],
  ],
  ["excel", "Excel", "data", ["excel"]],
  ["power-bi", "Power BI", "data", ["power bi", "powerbi"]],
  ["tableau", "Tableau", "data", ["tableau"]],
  ["machine-learning", "Machine learning", "data", ["machine learning", "strojove ucenie"]],

  ["aws", "AWS", "cloud", ["aws", "amazon web services"]],
  ["gcp", "Google Cloud", "cloud", ["gcp", "google cloud"]],
  ["azure", "Azure", "cloud", ["azure"]],
  ["docker", "Docker", "cloud", ["docker"]],
  ["kubernetes", "Kubernetes", "cloud", ["kubernetes", "k8s"]],
  ["terraform", "Terraform", "cloud", ["terraform"]],
  [
    "ci-cd",
    "CI/CD",
    "cloud",
    ["ci/cd", "cicd", "continuous integration", "github actions", "gitlab ci", "jenkins"],
  ],
  ["linux", "Linux", "cloud", ["linux"]],
  ["git", "Git", "cloud", ["git", "github", "gitlab"]],
  ["firebase", "Firebase", "cloud", ["firebase"]],

  ["jest", "Jest", "testing", ["jest", "vitest"]],
  ["playwright", "Playwright", "testing", ["playwright"]],
  ["cypress", "Cypress", "testing", ["cypress"]],
  ["unit-testing", "Unit testing", "testing", ["unit testing", "unit tests", "unit test", "unit testy", "tdd"]],

  ["figma", "Figma", "design", ["figma"]],
  ["ux", "UX design", "design", ["ux", "ui/ux", "user experience", "ux design"]],
  [
    "user-research",
    "User research",
    "design",
    ["user research", "usability testing", "user interviews", "pouzivatelsky vyskum", "pouzivatelskeho vyskumu"],
  ],

  ["agile", "Agile", "product", ["agile", "agiln"]],
  ["scrum", "Scrum", "product", ["scrum"]],
  ["kanban", "Kanban", "product", ["kanban"]],
  ["jira", "Jira", "product", ["jira"]],
  ["confluence", "Confluence", "product", ["confluence"]],
  ["roadmap", "Product roadmap", "product", ["roadmap", "roadmapa", "product roadmap"]],
  [
    "stakeholders",
    "Stakeholder management",
    "product",
    ["stakeholder management", "stakeholders", "stakeholder"],
  ],
  ["a-b-testing", "A/B testing", "product", ["a/b testing", "a/b test", "ab testing", "a/b testovanie"]],
  ["okr", "OKRs", "product", ["okr", "okrs"]],
  [
    "analytics",
    "Product analytics",
    "product",
    ["product analytics", "google analytics", "web analytics", "mixpanel", "amplitude", "produktova analytika"],
  ],

  [
    "communication",
    "Communication",
    "soft",
    ["communication", "communicative", "komunikacia", "komunikacne", "komunikativnost", "komunikativny"],
  ],
  [
    "teamwork",
    "Teamwork",
    "soft",
    ["teamwork", "team work", "team player", "timova praca", "praca v time", "timovy hrac"],
  ],
  ["leadership", "Leadership", "soft", ["leadership", "team lead", "team leader", "vedenie timu", "veduci timu"]],
  ["problem-solving", "Problem solving", "soft", ["problem solving", "problem-solving", "riesenie problemov"]],
  ["mentoring", "Mentoring", "soft", ["mentoring", "mentored", "mentorovanie", "mentoroval", "mentorovala"]],
  ["english", "English", "soft", ["english", "anglictina", "anglictine", "anglictinu", "anglictiny"]],
];

const SLOVAK_CASE_ENDING = "(?:e|u|a|i|y|om|ou|ov|och|mi|ami|ach)?";

/** Lowercase, strip diacritics — "Komunikačné" and "komunikacne" are the same word. */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

function aliasPattern(alias: string): string {
  const body = escapeRegExp(alias).replace(/ /g, "[\\s-]+");
  return /[a-z]$/.test(alias) ? body + SLOVAK_CASE_ENDING : body;
}

interface CompiledSkill {
  skill: Skill;
  regex: RegExp;
}

// One alternation per skill, longest alias first, so "react.js" is one mention, not two.
const COMPILED: CompiledSkill[] = TAXONOMY.map(([id, name, category, aliases]) => {
  const alternation = [...aliases]
    .sort((a, b) => b.length - a.length)
    .map(aliasPattern)
    .join("|");
  return {
    skill: { id, name, category },
    regex: new RegExp(`(?<![a-z0-9+#.])(?:${alternation})(?![a-z0-9+#])`, "g"),
  };
});

function countMatches(regex: RegExp, text: string): number {
  regex.lastIndex = 0;
  let n = 0;
  while (regex.exec(text) !== null) n++;
  return n;
}

// ── Must-have vs nice-to-have ─────────────────────────────────────────────────────────

const PREFERRED_MARKER =
  /(nice[\s-]to[\s-]have|good to have|preferred|bonus|(?:is|are|would be) (?:a )?(?:big )?plus|advantage(?:ous)?|vyhodou|vyhoda|je plus|plusom|ocenime|ocenujeme)/;
const REQUIRED_MARKER =
  /(requirements?|required|must[\s-]have|qualifications|what you (?:bring|have|need)|pozadujeme|poziadavky|ocakavame|nevyhnutne)/;

/**
 * Split a posting into short segments (lines and sentences) and label each one: a heading
 * such as "Nice to have:" or "Výhodou:" switches every following segment, an inline "is a
 * plus" marks only its own sentence.
 */
function prioritizedSegments(job: string): { text: string; priority: Priority }[] {
  const segments = normalize(job)
    .split(/\n|(?<=[.;!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  let mode: Priority = "required";
  const out: { text: string; priority: Priority }[] = [];

  for (const segment of segments) {
    const heading = /^(.{0,40}?):\s*(.*)$/.exec(segment);
    if (heading) {
      const label = heading[1]!;
      if (PREFERRED_MARKER.test(label)) {
        mode = "preferred";
        out.push({ text: heading[2]!, priority: mode });
        continue;
      }
      if (REQUIRED_MARKER.test(label)) {
        mode = "required";
        out.push({ text: heading[2]!, priority: mode });
        continue;
      }
    }
    // "Nice to have: Terraform" in the middle of a sentence-less line.
    const inlineHeading = segment.search(new RegExp(PREFERRED_MARKER.source + "\\s*:"));
    if (inlineHeading > 0) {
      out.push({ text: segment.slice(0, inlineHeading), priority: mode });
      mode = "preferred";
      out.push({ text: segment.slice(inlineHeading), priority: mode });
      continue;
    }
    out.push({ text: segment, priority: PREFERRED_MARKER.test(segment) ? "preferred" : mode });
  }
  return out;
}

// ── Keyword fallback ──────────────────────────────────────────────────────────────────

const STOPWORDS = new Set(
  (
    "about after also and are because been being both could does doing each from have having " +
    "into just more most must need needs only other over same should some such than that their " +
    "them then there these they this those through under very want wanted were what when where " +
    "which while will with within would your you our ours work working role team years year " +
    "alebo ako aby bude budes by byt este jeho jej ich ktory ktora ktore ktori lebo medzi mame " +
    "mate nas nasa nase naso pre pri pred pod podla preto sme ste tak tiez tento tato toto uz " +
    "velmi vsetko ktorym ktorych hladame ponukame"
  ).split(" ")
);

function significantWords(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

function stem(word: string): string {
  return word.length > 5 ? word.replace(/(ing|ers|er|es|s)$/, "") : word;
}

function keywordAnalysis(cv: string, job: string): Pick<AnalysisResult, "matched" | "missing"> {
  const counts = new Map<string, number>();
  for (const w of significantWords(job)) counts.set(w, (counts.get(w) ?? 0) + 1);
  const cvStems = new Map<string, number>();
  for (const w of significantWords(cv)) cvStems.set(stem(w), (cvStems.get(stem(w)) ?? 0) + 1);

  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  const matched: SkillHit[] = [];
  const missing: SkillHit[] = [];
  for (const [word, jobMentions] of top) {
    const hit: SkillHit = {
      skill: { id: `kw:${word}`, name: word, category: "keyword" },
      priority: "required",
      jobMentions,
      cvMentions: cvStems.get(stem(word)) ?? 0,
    };
    (hit.cvMentions > 0 ? matched : missing).push(hit);
  }
  return { matched, missing };
}

// ── Advice ────────────────────────────────────────────────────────────────────────────

/** Weak openers, normalized, with the form shown back to the reader. */
const WEAK_PHRASES: [match: string, display: string][] = [
  ["responsible for", "responsible for"],
  ["worked on", "worked on"],
  ["helped with", "helped with"],
  ["involved in", "involved in"],
  ["participated in", "participated in"],
  ["duties included", "duties included"],
  ["tasked with", "tasked with"],
  ["zodpovedny za", "zodpovedný za"],
  ["zodpovedna za", "zodpovedná za"],
  ["podielal som sa", "podieľal som sa"],
  ["podielala som sa", "podieľala som sa"],
  ["pracoval som na", "pracoval som na"],
  ["pracovala som na", "pracovala som na"],
  ["pomahal som", "pomáhal som"],
  ["pomahala som", "pomáhala som"],
  ["mal som na starosti", "mal som na starosti"],
  ["mala som na starosti", "mala som na starosti"],
];

/** A number that measures an outcome — a percentage, money, a count of people or things. */
const OUTCOME_NUMBER =
  /\d+\s?%|[€$£]\s?\d|\d+\s?(?:eur|usd|k|m)\b|\d+\s?x\b|\d{2,}\+?\s?(?:users|customers|clients|people|projects|downloads|pouzivatelov|zakaznikov|klientov|ludi|projektov)/g;

function roleTitle(job: string): string | null {
  const first = job
    .split("\n")
    .map((l) => l.replace(/^[\s#*\-–•]+/, "").trim())
    .find(Boolean);
  if (!first || first.length > 60 || /[.:]$/.test(first)) return null;
  if (first.split(/\s+/).length > 7) return null;
  return first.replace(/\s*\(.*\)\s*$/, "");
}

function recommend(cv: string, job: string, matched: SkillHit[], missing: SkillHit[]): Recommendation[] {
  const recs: Recommendation[] = [];
  const cvNorm = normalize(cv);

  const missingRequired = missing.filter((h) => h.priority === "required").slice(0, 6);
  if (missingRequired.length > 0) recs.push({ kind: "add-keyword", skills: missingRequired.map((h) => h.skill) });

  const missingPreferred = missing.filter((h) => h.priority === "preferred").slice(0, 6);
  if (missingPreferred.length > 0) recs.push({ kind: "add-preferred", skills: missingPreferred.map((h) => h.skill) });

  const thin = matched.filter((h) => h.jobMentions >= 2 && h.cvMentions < h.jobMentions).slice(0, 4);
  if (thin.length > 0) recs.push({ kind: "strengthen", hits: thin });

  const title = roleTitle(job);
  if (title && !cvNorm.includes(normalize(title))) recs.push({ kind: "mirror-title", title });

  if ((cvNorm.match(OUTCOME_NUMBER) ?? []).length < 2) recs.push({ kind: "quantify" });

  const phrases = WEAK_PHRASES.filter(([m]) => cvNorm.includes(m)).map(([, d]) => d);
  if (phrases.length > 0) recs.push({ kind: "weak-verbs", phrases });

  return recs;
}

// ── Public API ────────────────────────────────────────────────────────────────────────

export function tierFor(score: number): MatchTier {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

const WEIGHT: Record<Priority, number> = { required: 1, preferred: 0.5 };

function byImportance(a: SkillHit, b: SkillHit): number {
  if (a.priority !== b.priority) return a.priority === "required" ? -1 : 1;
  return b.jobMentions - a.jobMentions;
}

/** `null` until both texts have content — there is nothing to score yet. */
export function analyzeCv(cv: string, job: string): AnalysisResult | null {
  if (!cv.trim() || !job.trim()) return null;

  const cvNorm = normalize(cv);
  const segments = prioritizedSegments(job);

  const hits: SkillHit[] = [];
  for (const { skill, regex } of COMPILED) {
    let jobMentions = 0;
    let priority: Priority | null = null;
    for (const segment of segments) {
      const n = countMatches(regex, segment.text);
      if (n === 0) continue;
      jobMentions += n;
      // Named as a must-have anywhere → a must-have.
      if (priority !== "required") priority = segment.priority;
    }
    if (priority === null) continue;
    hits.push({ skill, priority, jobMentions, cvMentions: countMatches(regex, cvNorm) });
  }

  let method: AnalysisResult["method"] = "skills";
  let matched = hits.filter((h) => h.cvMentions > 0);
  let missing = hits.filter((h) => h.cvMentions === 0);
  if (hits.length === 0) {
    method = "keywords";
    ({ matched, missing } = keywordAnalysis(cv, job));
  }

  matched.sort(byImportance);
  missing.sort(byImportance);

  const total = [...matched, ...missing].reduce((s, h) => s + WEIGHT[h.priority], 0);
  const got = matched.reduce((s, h) => s + WEIGHT[h.priority], 0);
  const score = total === 0 ? 0 : Math.round((100 * got) / total);

  return {
    score,
    tier: tierFor(score),
    method,
    matched,
    missing,
    recommendations: recommend(cv, job, matched, missing),
  };
}

// ── Samples (one click fills both panels) ─────────────────────────────────────────────
// Each is deliberately a partial fit, so a first-time visitor sees both lists and advice —
// and together they land in all three tiers: backend strong, frontend partial, product weak.

export const SAMPLES: Record<"en" | "sk", Sample[]> = {
  en: [
    {
      id: "frontend",
      label: "Frontend Developer",
      job: `Frontend Developer
We are hiring a Frontend Developer to build our customer dashboard.

Requirements:
- 3+ years with React and TypeScript
- Strong CSS and responsive design
- Experience consuming REST APIs and GraphQL
- Unit testing with Jest
- Git and code review

Nice to have:
- Next.js
- Accessibility (WCAG)
- Figma`,
      cv: `Jana Novak — Frontend Engineer
Built React and JavaScript single-page apps for 4 years.
Styled components with CSS and Tailwind, mobile first.
Responsible for the design system and Figma handoffs.
Worked on REST API integration with the backend team.
Git, GitHub, pull requests.`,
    },
    {
      id: "backend",
      label: "Backend Developer",
      job: `Backend Developer (Node.js)
Requirements:
- Node.js and TypeScript
- PostgreSQL and Redis
- Docker and CI/CD pipelines
- Designing REST APIs and microservices
- AWS

Nice to have:
- Kubernetes
- Kafka
- Terraform`,
      cv: `Peter Horvath — Software Engineer
Node.js and TypeScript developer with 5 years of experience building REST APIs and microservices.
Designed a PostgreSQL schema serving 40,000 users; cut query time by 35%.
Containerised services with Docker; deployed on AWS with GitHub Actions.
Mentored two junior developers.`,
    },
    {
      id: "product",
      label: "Product Manager",
      job: `Product Manager
Requirements:
- Own the product roadmap and prioritisation
- Stakeholder management across sales and engineering
- Agile and Scrum delivery with Jira
- Data analysis with SQL and product analytics
- Excellent communication in English

Nice to have:
- A/B testing
- OKRs
- User research`,
      cv: `Lucia Kovacova — Project Coordinator
Coordinated releases in an Agile team using Jira and Confluence.
Helped with the product roadmap and customer interviews.
Presented weekly updates to stakeholders.
Ran A/B tests on onboarding emails.`,
    },
  ],
  sk: [
    {
      id: "frontend",
      label: "Frontend vývojár",
      job: `Frontend vývojár
Hľadáme frontend vývojára do tímu, ktorý stavia zákaznícky portál.

Požadujeme:
- 3+ roky skúseností s React a TypeScript
- CSS a responzívny dizajn
- Integrácia REST API a GraphQL
- Unit testy v Jest
- Git a code review
- Komunikačné zručnosti

Výhodou:
- Next.js
- Prístupnosť (WCAG)
- Figma`,
      cv: `Jana Nováková — Frontend Engineer
4 roky vývoja jednostránkových aplikácií v React a JavaScript.
CSS a Tailwind, mobile first.
Zodpovedná za dizajn systém a podklady z Figma.
Podieľala som sa na integrácii REST API.
Git, GitHub, pull requesty. Dobrá komunikácia v tíme.`,
    },
    {
      id: "backend",
      label: "Backend vývojár",
      job: `Backend vývojár (Node.js)
Požadujeme:
- Node.js a TypeScript
- PostgreSQL a Redis
- Docker a CI/CD
- Návrh REST API a mikroslužieb
- AWS

Výhodou:
- Kubernetes
- Kafka
- Terraform`,
      cv: `Peter Horváth — Software Engineer
Node.js a TypeScript vývojár s 5 rokmi skúseností s REST API a mikroslužbami.
Navrhol som PostgreSQL schému pre 40 000 používateľov; skrátil som odozvu o 35 %.
Služby v Dockeri, nasadenie na AWS cez GitHub Actions.
Mentoroval som dvoch juniorov.`,
    },
    {
      id: "product",
      label: "Produktový manažér",
      job: `Produktový manažér
Požadujeme:
- Vlastníctvo produktovej roadmapy a prioritizácie
- Riadenie stakeholderov naprieč obchodom a vývojom
- Agilné doručovanie v Scrume a Jira
- Analýza dát v SQL a produktová analytika
- Výborná komunikácia v angličtine

Výhodou:
- A/B testovanie
- OKR
- Používateľský výskum`,
      cv: `Lucia Kováčová — Project Coordinator
Koordinovala som releasy v agilnom tíme s Jira a Confluence.
Pomáhala som s produktovou roadmapou a rozhovormi so zákazníkmi.
Každý týždeň som prezentovala výsledky stakeholderom.
Spúšťala som A/B testy onboarding e-mailov.`,
    },
  ],
};
