/**
 * record-data.ts — the factory's own git record, as tokenwise.sk/how-it-works tells it:
 * fifteen eras reconstructed from the commit history of sw-factory and factory-web
 * (both private repositories, so GitPulse Studio cannot read them live). Copied from
 * factory-web `app/(en)/how-it-works/content.ts` + `record-continuation.ts` on 2026-10-16;
 * every count and date is theirs. Append-only: a new era is a new object at the end.
 */

export interface EraEntry {
  date: string;
  lead?: string;
  text: string;
}

export interface Era {
  numeral: string;
  dates: string;
  scale: string;
  /** "human" marks an era where we deliberately took capability away from the machine. */
  kind: "machine" | "human";
  title: string;
  tagline: string;
  lede: string;
  entries: EraEntry[];
  unlocked: string;
}

export const ERAS: Era[] = [
  {
    numeral: "I",
    dates: "12–14 June",
    scale: "3 days · 49 commits",
    kind: "machine",
    title: "The first run",
    tagline: "From an empty repository to a line that deploys on its own.",
    lede:
      "The first commit was not code — it was the architecture. A token budget and cost accounting sat in the harness skeleton from day one, not bolted on after the first surprising invoice. That detail shaped everything after it: the factory knew what it cost before it knew how to work.",
    entries: [
      { date: "12 Jun", lead: "Initial commit — the architecture.", text: "A flat orchestrator-worker pattern, with a deterministic orchestrator in code instead of an improvising model." },
      { date: "13 Jun", lead: "A harness with a token budget and cost capture.", text: "The single choke point every model call passes through." },
      { date: "13 Jun", lead: "The quality chain.", text: "Analyst → Developer → Review → Security → Tester. Halt on failure, and handoffs by file rather than by conversation." },
      { date: "13 Jun", lead: "The first real run failed.", text: "Agents span to their turn limit without finishing. The toolkit was showing them tools they were not allowed to use, so they kept trying them. The fix was to restrict which tools are visible, not merely which are permitted." },
      { date: "14 Jun", lead: "Model tiering.", text: "A cheap, a mid and a frontier model by role. Never the expensive one for everything." },
      { date: "14 Jun", lead: "A context engine.", text: "Agents receive the project's own documentation instead of searching blind." },
      { date: "14 Jun", lead: "Cross-issue learning.", text: "The factory remembers finished work, reusable components and its own failures." },
      { date: "14 Jun", lead: "Always-on.", text: "A task moved in the tracker starts the line by itself. From here the factory runs, rather than gets run." },
      { date: "14 Jun", text: "Then fifteen commits about deployment: timeouts, tooling inside the sandbox, environment injection, rebasing on resume. The last mile cost more work than the entire pipeline." },
    ],
    unlocked:
      "Request → spec → code → review → tests → staging → production, with no human in the middle. On one project, and without brakes.",
  },
  {
    numeral: "II",
    dates: "15–16 June",
    scale: "2 days · 13 commits",
    kind: "human",
    title: "Brakes, and a bill for €8.92",
    tagline: "The day the factory got approval gates and learned not to loop.",
    lede:
      "One task failed its tests three times in a row. Each time the developer agent tried to repair the implementation; after three rounds the bill was €8.92 and the credits ran out. The conclusion was not to improve the retry loop. It was to delete it.",
    entries: [
      { date: "15 Jun", lead: "Human approval gates.", text: "A production deploy needs an explicit approval from every team member. No agent can trigger one." },
      { date: "15 Jun", lead: "Authenticated webhooks and run locks.", text: "Concurrent runs stop overwriting each other's state." },
      { date: "15 Jun", lead: "A cost estimate before development.", text: "The work is sized S/M/L/XL and the harness derives the expected tokens and euros from it." },
      { date: "16 Jun", lead: "The end of the test fix loop.", text: "Failing tests stop the line for human review. The code-review loop stayed — cheaper, and a higher return." },
      { date: "16 Jun", lead: "The factory remembers failures.", text: "What broke, at which gate and why, is visible to future runs on similar work." },
      { date: "16 Jun", lead: "One gate, two meanings.", text: "The same approval state covers signing off the spec before development and signing off before production." },
    ],
    unlocked:
      "The factory lost the ability to spend money unobserved. You approve the specification before the first expensive token is spent.",
  },
  {
    numeral: "III",
    dates: "3–4 July",
    scale: "2 days · 4 commits",
    kind: "machine",
    title: "Taste and memory",
    tagline: "Four commits carrying thirteen tasks. The factory stopped being blind to design.",
    lede:
      "A dedicated role appeared between analysis and development — the UI Architect. Not to make things pretty, but because a design decision taken in passing while writing code is a design decision taken by accident. At the same time the context engine stopped behaving like a vacuum cleaner and started behaving like a librarian.",
    entries: [
      { date: "3 Jul", lead: "UI Architect and design context.", text: "A project's design system — colour, spacing, components, UX conventions — is extracted from the repository and stored. The agent reads it instead of inventing it." },
      { date: "4 Jul", lead: "Structural summaries instead of whole files.", text: "The most relevant files in full, the rest as structure. The tokens saved are visible in the context itself." },
      { date: "4 Jul", lead: "Prompt caching.", text: "The static agent definition goes first and the task last, so the expensive part of the prompt can be reused. Cache hit rate is measured on every call." },
      { date: "4 Jul", lead: "A circuit breaker.", text: "Three identical failures on similar work within a week block the next attempt. The factory stops walking into the same wall on its own." },
      { date: "4 Jul", lead: "Semantic search over past work,", text: "and adaptive budget calibration from history — which can only tighten a budget, never loosen it." },
      { date: "4 Jul", lead: "A design knowledge base.", text: "161 product categories, 85 styles, 74 typographic pairings, 99 UX guidelines. The harness retrieves candidates at zero token cost; the agent chooses between them." },
    ],
    unlocked:
      "The output stopped looking generated. And the cost of a task started falling without the quality falling with it.",
  },
  {
    numeral: "IV",
    dates: "11–15 July",
    scale: "5 days · 61 commits",
    kind: "machine",
    title: "One standard for the whole portfolio",
    tagline: "The Golden Stack. Five products, five different technologies, one migration.",
    lede:
      "The largest single leap in this history, and the least AI-flavoured thing in it. Five products ran on five different stacks, so every task needed different context, different scripts, different tests. The decision: one stack for everything, a feature freeze, five waves, big bang. In four days every project was unified and back in production.",
    entries: [
      { date: "11 Jul", lead: "A lint gate inside the sandbox.", text: "Zero tokens, and it catches exactly what an expensive model would otherwise be spent on." },
      { date: "11 Jul", lead: "A cost report.", text: "Spend per project and per agent, estimate against actual, cache hit rate." },
      { date: "12 Jul", lead: "The Golden Stack as a canonical standard.", text: "Machine-readable version pins and a compliance checker alongside the prose." },
      { date: "12 Jul", lead: "The standard is injected into prompts.", text: "It is not a document sitting on a disk; it is an input to every decision the agents make." },
      { date: "12 Jul", lead: "A monthly upgrade watch.", text: "When a pinned technology ships a major version, a task opens by itself. Every project moves together, or none does." },
      { date: "13 Jul", lead: "Tooling travels with the repository.", text: "Every device — desktop, phone, web session — sees the same pinned version." },
      { date: "15 Jul", lead: "Migration complete.", text: "All five projects on one stack, in production, behind CI quality gates." },
      { date: "15 Jul", lead: "Stale documentation is a bug.", text: "Because it goes straight into an agent's prompt as truth." },
    ],
    unlocked:
      "A new project joins with a single command instead of a week of integration. The factory stopped being a tool for one product and became a line.",
  },
  {
    numeral: "V",
    dates: "16–17 July",
    scale: "2 days · 35 commits",
    kind: "machine",
    title: "Independence and rules",
    tagline: "The factory stopped depending on a single model vendor — and got a security baseline.",
    lede:
      "In one day a layer appeared that separates what has to be done from who does it. Any role can run on a different vendor's model, with the same permissions and the same accounting. Quality is not settled by an AI referee but by measured outcome: did the build pass, did review pass, what did it cost, how long did it take.",
    entries: [
      { date: "16 Jul", lead: "A runner contract.", text: "Budget and cost accounting sit above every vendor and cannot be bypassed by swapping the model underneath." },
      { date: "16 Jul", lead: "Second and third vendor adapters,", text: "behind the same permission layer as the first." },
      { date: "16 Jul", lead: "A quality scorecard and leaderboard.", text: "Plain scoring, no AI referee. Historical quality, cost and speed per vendor." },
      { date: "16 Jul", lead: "This website joined as the sixth project.", text: "From here the factory builds its own site through its own line." },
      { date: "17 Jul", lead: "One security baseline for every project and for the factory itself.", text: "The Security Auditor receives it as a checklist and fails a change that breaks a mandatory rule." },
      { date: "17 Jul", lead: "Five product rules.", text: "Dark only, mobile first, findability, English first, store readiness — mandatory for every current and future project." },
    ],
    unlocked:
      "If one model provider gets expensive or goes down, the line keeps running. Security and the product minimum are not checked at the end; they are inputs to the brief.",
  },
  {
    numeral: "VI",
    dates: "20–23 July",
    scale: "4 days · 42 commits",
    kind: "machine",
    title: "Sight, taste and human memory",
    tagline: "The first time the factory looked at what it had made.",
    lede:
      "Until this point UI was judged blind — from a written spec, without a single pixel. Visual defects were found by hand, late. Three things arrived together: verification against the live staging URL, a visual check of real screenshots, and, most importantly, a place for a human to deposit knowledge that exists nowhere in the code.",
    entries: [
      { date: "20 Jul", lead: "Staging verification.", text: "After deployment the line walks the real URL, takes screenshots, runs tests against it and attaches the evidence to the task." },
      { date: "22 Jul", lead: "Visual QA.", text: "Mobile at 390px and desktop at 1280px, checked for defects. Explicitly a guardian of intent, not a judge of beauty — there is no AI rubric for aesthetics." },
      { date: "22 Jul", lead: "A two-mode UI Architect.", text: "Extend mode for incremental work, where novelty is a bug; define mode for a new page, where a design thesis and an anti-generic check are required." },
      { date: "22 Jul", lead: "A brain for human knowledge.", text: "A person writes a note; agents retrieve it with a tool. Agents may read it, never write it." },
      { date: "22 Jul", lead: "An art director and a direction pack.", text: "A project's design direction as a document that gets parsed and fed into the line." },
      { date: "23 Jul", text: "And the reality of operations: the machine's memory ceiling went from 512 MB to 2.5 GB, because the old limit had been killing runs outright." },
    ],
    unlocked:
      "“It works” stopped being a claim by an agent and became a screenshot and a green test against a live address. Knowledge only a human holds finally has somewhere to go.",
  },
  {
    numeral: "VII",
    dates: "25 July – 2 August",
    scale: "9 days · 129 commits",
    kind: "human",
    title: "The shop window, and a key for the customer",
    tagline: "The densest stretch in the whole history — and the first time a customer got a key.",
    lede:
      "The factory built itself as a product. The desktop site is a single screen of nine acts with a live 3D scene; a phone gets a document built from the same content, written once. Then came the change that alters the relationship with a customer: a portal with a login, a dashboard, live task status and visible spend.",
    entries: [
      { date: "25 Jul", lead: "A cinematic hero.", text: "Shader cores, a 2,400-particle field, a hand-rolled bloom — and a frame-rate watchdog that degrades one way only, so a struggling phone simplifies the scene and never flickers back." },
      { date: "25 Jul", lead: "A capability gate.", text: "The shell is chosen by viewport and input device, not by graphics card. The server always renders the document, so the content survives even where the 3D cannot." },
      { date: "28 Jul", lead: "The Analog Core landing.", text: "Nine acts, one source of content for both desktop and phone." },
      { date: "28 Jul", lead: "Live data, projects, ideas, a model arena.", text: "The site stopped being a brochure and became a window into a running line." },
      { date: "29 Jul", lead: "Analytics with consent, sitemap, legal layer,", text: "plus a four-step project wizard." },
      { date: "30 Jul", text: "A small commit that says a lot: unsubstantiated vendor claims were deleted from the arena because they were not backed by measurement." },
      { date: "31 Jul", lead: "Security rules", text: "and a prototype generation pipeline." },
      { date: "1 Aug", lead: "The customer portal.", text: "Sign-in, activation, dashboard, admin panel, approval functions, security rules and indexes." },
      { date: "2 Aug", lead: "The line syncs task state into the portal.", text: "A customer can see what is happening to their request without having to ask." },
    ],
    unlocked:
      "Transparency became a feature instead of a promise. You get an account, live status, visible spend, and the approval.",
  },
  {
    numeral: "VIII",
    dates: "3–7 August",
    scale: "5 days · 108 commits",
    kind: "machine",
    title: "Measurement instead of opinion",
    tagline: "The factory started running experiments on itself.",
    lede:
      "The old context engine pre-packed context. The new one inverts it: a minimal core plus tools the agent uses to pull exactly what it needs, at the moment it needs it. No tokens spent on context nobody read. On top sits the layer that turns this into science rather than opinion — feature flags, telemetry, and a mandatory classification of every failure. Was it bad context, or bad judgement?",
    entries: [
      { date: "3 Aug", lead: "A lean core and just-in-time retrieval.", text: "The agent decides what to pull; the server verifies it is allowed to have it." },
      { date: "3 Aug", lead: "Failure attribution.", text: "Every failure is classified — context missing, wrong or ignored, against reasoning, implementation or test error." },
      { date: "3 Aug", lead: "Feature flags and telemetry.", text: "One field switches the whole engine back to the previous version. 130 tests cover it." },
      { date: "4 Aug", lead: "Model choice in the admin interface.", text: "Vendor and budget mode per project, set through a screen instead of in code, with a leaderboard of historical quality, cost and speed." },
      { date: "4 Aug", lead: "One source of truth for project configuration.", text: "The pipeline reads it live, with a cache and a fallback." },
      { date: "4 Aug", lead: "Verification that a pull request is genuinely merged", text: "before a production deploy runs." },
      { date: "5 Aug", lead: "Cost per run.", text: "Run and loop counts, and a token spend indicator inside the customer dashboard." },
      { date: "7 Aug", lead: "This page.", text: "And a single shared header across every screen the factory owns." },
    ],
    unlocked:
      "The factory can measure whether a new version of its own brain beats the last one — and roll it back with a single switch when it does not.",
  },
  {
    numeral: "IX",
    dates: "8–31 August",
    scale: "24 days · 95 commits",
    kind: "machine",
    title: "The Analyst learns to think",
    tagline: "A four-turn process, corpus distillation, and the end of pre-packed context.",
    lede:
      "The Analyst agent was rewritten from scratch. Instead of receiving a wall of context it might not need, it now follows a structured four-turn process: scope identification, codebase exploration, memory retrieval, then synthesis. At the end of every run, a distiller compresses the work into a corpus record worth keeping — so the next Analyst learns from the last one.",
    entries: [
      { date: "8 Aug", lead: "Provider Health Check.", text: "A manual smoke test of all registered providers from the admin UI — nine models tested, results stored with history." },
      { date: "11 Aug", lead: "Process page.", text: "An interactive visualization of the entire pipeline, with collapsible phases and mode/provider filters." },
      { date: "14 Aug", lead: "Self-service onboarding.", text: "A four-step wizard that lets a new project join the factory without touching code." },
      { date: "17 Aug", lead: "n8n installed.", text: "The automation layer for the growth loop — n8n.tokenwise.sk live with nginx, SSL, and daily backups to GCS." },
      { date: "17 Aug", lead: "MDX blog infrastructure.", text: "Weekly AI articles now deploy through the same pipeline as code." },
      { date: "20 Aug", lead: "Context Engine V0.", text: "The Planner was removed; a minimal core plus JIT retrieval replaced pre-packed context. The Analyst now decides what to pull." },
      { date: "20 Aug", lead: "Four-turn Analyst.", text: "A structured process: scope → exploration → memory → synthesis. 130 tests cover the new engine." },
      { date: "24 Aug", lead: "Analyst context restoration.", text: "An audit found most of V0 was dead in production. Fixed in one wave — project briefs, retrieval traces, and spec validation now work." },
      { date: "24 Aug", lead: "Corpus distillation.", text: "One Haiku call at the end of each run turns the work into a structured record — approach summary, lessons, what to avoid. €0.02 per call." },
      { date: "25 Aug", lead: "Audit pages.", text: "Native Next.js pages replaced iframe embeds for pipeline audit reports." },
      { date: "31 Aug", lead: "Measurement layer.", text: "O-series optimizations: founder comments filter, provider telemetry, budget mechanisms unified across all paths." },
      { date: "31 Aug", lead: "Social media publishing.", text: "GTM Wave 4: direct Meta Graph API calls from the pipeline. Articles with growth:article label auto-post to Facebook and Instagram after production deploy." },
    ],
    unlocked:
      "The Analyst stopped being a reader of walls and became a thinker with a process. Every run leaves behind knowledge the next one can use.",
  },
];

/** September → 9 October 2026, appended by factory-web `record-continuation.ts`. */
export const RECORD_CONTINUATION: Era[] = [
  {
    numeral: "X",
    dates: "1–7 September",
    scale: "7 days · 96 commits",
    kind: "machine",
    title: "A receipt for every step",
    tagline: "The bill stopped being a total and became a trail.",
    lede:
      "Knowing what a run cost was no longer enough. The next question was where the money went, what the agent actually read, and which decision sent the work around again. The measurement layer moved down to individual calls and operations. Even a run that died halfway through had to leave a receipt.",
    entries: [
      { date: "1 Sep", lead: "Model choice by role.", text: "The process page gained an agent grid. The Analyst, Developer and Reviewer no longer had to inherit one project-wide choice." },
      { date: "2 Sep", lead: "Local models joined the line.", text: "A local provider can run a role, with a fallback when it is unavailable. A specification can be started from the command line and kept for the next phase." },
      { date: "2 Sep", lead: "One record per model call.", text: "Tokens, context size, retries and cost share a run identity. The accounting can be reconciled against the calls that produced it." },
      { date: "4 Sep", lead: "The work between model calls became visible.", text: "Sandbox commands, tool results, Git operations, pull requests, deployment and social publishing gained timed spans." },
      { date: "4 Sep", lead: "Cost per correct output.", text: "Gate verdicts became quality measurements, so a cheap failed run could no longer win simply by being cheap." },
      { date: "5 Sep", lead: "Decisions left a trace.", text: "Retries, budget stops, skipped phases, provider fallbacks and circuit-breaker blocks are recorded with their reasons." },
      { date: "5 Sep", lead: "Context has a journey.", text: "The factory records what was retrieved, how the context grew, and which retrieved passages appeared in the output." },
      { date: "6–7 Sep", lead: "A monitoring page and weekly product audits.", text: "The telemetry got a place to be read. UX, logging and the context engine got a recurring inspection rather than waiting for a complaint." },
    ],
    unlocked:
      "A slow or expensive run can be followed back to the call, the tool and the decision that made it so. The factory gained evidence for where to improve next.",
  },
  {
    numeral: "XI",
    dates: "8–18 September",
    scale: "11 days · 67 commits",
    kind: "human",
    title: "Stop writing the whole app",
    tagline: "The prototype became an assembly job. The model lost its tools.",
    lede:
      "The first prototype line asked a Developer to build an application from a brief. It was slow, and the baseline was blunt: three attempts, no live prototypes. More instructions and more turns did not solve the underlying problem. The next version took the code-writing job away. Tested patterns belonged to the template; the model's job was to choose and fill them.",
    entries: [
      { date: "8 Sep", lead: "The first running-prototype pipeline.", text: "A brief enters through the wizard, moves to the build machine and gets a deadline. A watchdog watches stuck work; a daily reaper removes expired demos." },
      { date: "9 Sep", lead: "The public entry got boundaries.", text: "Abuse controls, safer email rendering and ownership checks were added around the anonymous wizard and prototype adoption." },
      { date: "11–12 Sep", lead: "More guidance was not enough.", text: "Pre-built components, progress tracking and a larger turn allowance were tried. The assembly-line redesign recorded the failed baseline rather than hiding it." },
      { date: "12 Sep", lead: "A crashed run still has a bill.", text: "Usage captured before a stream failure is retained. The real failing gate is recorded instead of labelling every failure a build error." },
      { date: "14 Sep", lead: "Assembly replaced generation.", text: "The template supplies its schema. One model call writes the copy; deterministic code composes the configuration at zero token cost." },
      { date: "14 Sep", lead: "No tools means no tools.", text: "The content role cannot edit files or run commands. The restriction is enforced by the harness, rather than left as a sentence in its prompt." },
      { date: "15 Sep", lead: "The Golden demo finally had an address.", text: "The earlier claim that it was live met a 404. A real deployer and Firebase configuration replaced the claim, and the template repository became public." },
      { date: "17 Sep", lead: "A name chosen by the customer.", text: "Prototypes gained readable /newapp/ addresses instead of a separate Firebase site for every idea." },
      { date: "18 Sep", lead: "The template became the contract.", text: "It publishes the patterns it can actually render. The model chooses their composition; the customer keeps the brief, palette and language. Duplicate pattern lists and the extra wizard steps were removed." },
    ],
    unlocked:
      "The prototype line stopped paying a model to recreate infrastructure it already owned. Its creative freedom narrowed to a brief, a composition and the words inside tested components.",
  },
  {
    numeral: "XII",
    dates: "19–29 September",
    scale: "11 days · 67 commits",
    kind: "human",
    title: "A demo with an owner",
    tagline: "Working data, three free changes, and a boundary around customer code.",
    lede:
      "A prototype that looks finished but cannot save a record is a picture. The next stretch made the patterns work, opened the demos to visitors and gave their creators a route to keep them. At the same time the factory drew a harder boundary: customer applications moved away from the portal's origin, and private records stopped being public by accident.",
    entries: [
      { date: "19 Sep", lead: "The patterns started doing the work.", text: "The template gained a working data layer, languages it actually renders and contact messages that reach the project's tracker. The wizard offers those languages from the template itself." },
      { date: "20–21 Sep", lead: "Choose a model, not just a vendor.", text: "Agent settings became model-based. The content role can switch providers through the same resolver as the rest of the line." },
      { date: "21 Sep", lead: "Ideas became live demos.", text: "The catalog shows running prototypes and their fourteen-day deadline. An adopted prototype moves onto the projects grid." },
      { date: "24 Sep", lead: "Three free issues.", text: "Demo projects gained their own pipeline mode, per-issue token cap and merge guard. Their code lives on a demo branch; the free allowance is settled against completed work." },
      { date: "24 Sep", lead: "A separate origin for prototypes.", text: "Customer apps moved to apps.tokenwise.sk. Old addresses redirect, while customer code no longer shares the portal's browser session." },
      { date: "24 Sep", lead: "Fifteen palettes, and a way to refresh.", text: "The wizard previews colour pairs. Existing prototypes can receive template improvements without losing their own configuration." },
      { date: "25–28 Sep", lead: "Private means private.", text: "Prototype records became readable by their creators rather than the internet. Activation tokens and customer records received the same ownership boundary." },
      { date: "25–28 Sep", lead: "A real bill in the shop window.", text: "The landing console shows the last prototype's measured cost. AI hero images and the site's header reached the prototypes, with eleven refreshed by 28 September." },
      { date: "29 Sep", lead: "Credits beyond the free allowance.", text: "The wallet, checkout, webhook and refunds were exercised in Stripe test mode. That was evidence for the payment flow, not a claim that live payments had launched." },
      { date: "29 Sep", lead: "The site had to match the line.", text: "A funnel audit followed the calls to action through to credits. Landing copy returned to the product with human approval gates; the prototype route got its own explanation." },
    ],
    unlocked:
      "A visitor can try a running idea, a creator can keep it and request changes, and the portal has a boundary around it. The free line gained limits before it gained a price.",
  },
  {
    numeral: "XIII",
    dates: "30 September – 4 October",
    scale: "5 days · 86 commits",
    kind: "machine",
    title: "The line reaches the founder's desk",
    tagline: "Personal coding sessions became supervised work, with production as the finish line.",
    lede:
      "The factory already knew how to run on a server. Now it learned to coordinate Claude and Codex sessions on the founder's own machine. A task in Linear could reach a local session, ask for a decision, recover its state and continue through review. Finishing a conversation was not enough: completion had to be tied to the merged change and its deployment.",
    entries: [
      { date: "30 Sep", lead: "Legal research gained a second source.", text: "Law Expert combined court sources and compared legal similarity. A separate repair made statute-section searches reach Supreme Court decisions." },
      { date: "1 Oct", lead: "A demo became each visitor's own workspace.", text: "Signed-in visitors get separate data. The prototype owner has a contact card and inbox, with email forwarded only after the owner's address is verified." },
      { date: "1 Oct", lead: "Model experiments in pairs.", text: "An experiment runner compares model sets on the same briefs. It was deployed and dry-run checked; a paid comparison was still to come." },
      { date: "1 Oct", lead: "Pictures joined the publishing line.", text: "Generated article images are prepared before web and social publication and appear in sharing previews." },
      { date: "2 Oct", lead: "A supervisor for local Claude and Codex.", text: "Linear tasks reach personal sessions through a relay. A dashboard shows the runs, queue, permission requests and subscription limits." },
      { date: "2 Oct", lead: "Production became the completion test.", text: "The supervisor checks that the task's change was merged and deployed. Notifications mark production, queue and quota milestones instead of every intermediate step." },
      { date: "2 Oct", lead: "Replies without copied identifiers.", text: "The founder can answer a decision in Linear in plain text. Contact leads gained an automatic reply path of their own." },
      { date: "3–4 Oct", lead: "The applications got their own receipts.", text: "CV Matcher gained its verified job library and completed import; Reading Diary gained book lookup and required quizzes. Their delivery records include tests against the published prototypes." },
      { date: "3–4 Oct", lead: "Two ways to give the brief.", text: "The landing gained an A/B test between the wizard and a scripted chat. The chat asks the same questions, previews the palette and lets the visitor review the answers." },
      { date: "3–4 Oct", lead: "One workspace for founder operations.", text: "Local agents and company state came together in admin. A voice COO backend was activated too, with real-device and mailbox acceptance still left to verify." },
    ],
    unlocked:
      "The founder can send work from the tracker to a personal coding session and follow it through to production. The local tools joined the line's accountability, rather than ending at a finished chat.",
  },
  {
    numeral: "XIV",
    dates: "5–9 October",
    scale: "5 days · 71 commits",
    kind: "human",
    title: "Done means a page and a receipt",
    tagline: "Less automatic work. Stronger proof for the work that reaches a customer.",
    lede:
      "The next defects lived after the model had finished: a button with nowhere to go, a green build serving old HTML, a live prototype with no ready email. The repair followed the whole handoff instead of declaring success at the build. In the same week, automatic discovery of new work was switched off. The line got stricter about what it delivers and more restrained about what it starts.",
    entries: [
      { date: "7 Oct", lead: "Links became part of composition.", text: "Landing links are checked before a build. A closing call to action must lead to a real chapter, not an anchor invented by the model." },
      { date: "7 Oct", lead: "A model override the pipeline actually reads.", text: "The resolver gained per-prototype overrides across the roles it runs. Only the reader was deployed; the customer selector and its write endpoint remained unfinished." },
      { date: "8 Oct", lead: "Automatic work discovery stopped.", text: "Idle local agents no longer invent their next task. Reusable scheduled templates remain available for work the founder has chosen." },
      { date: "8 Oct", lead: "Build once, test those bytes.", text: "The prototype browser gate reuses the production export instead of building again. Publication requires smoke evidence from that same artifact." },
      { date: "8 Oct", lead: "Fewer checks, with current proof.", text: "CI selects tests and deployment targets from the change. A merge still needs verification of the current head and base; an old green run does not count." },
      { date: "8 Oct", lead: "Failed work stayed in the cost report.", text: "Recorded failed costs are shown alongside successful ones. Missing measurements are labelled incomplete or unavailable, rather than invented as zero." },
      { date: "8 Oct", lead: "Semantic memory returned to a local provider.", text: "Local embeddings restored retrieval. Exhausted-credit calls gained a bounded cooldown instead of repeatedly asking an empty account." },
      { date: "8 Oct", lead: "The creator can rewrite the words.", text: "Text editing gained instructions, previews and measured cost. A creator's publish reserves one credit, settles it after success and returns it on failure." },
      { date: "8 Oct", lead: "Bad copy gets feedback before another attempt.", text: "The template validates the actual production content, including nested records and every declared language. Repairs stay within the original budget; exhausted attempts fall back to a clearly labelled concept presentation." },
      { date: "8–9 Oct", lead: "The handoff reached the customer email.", text: "Assets upload before HTML, the live address must match the expected artifact, and a saved email snapshot is retried safely. Four missing ready notifications were recovered without rebuilding; provider receipts confirmed acceptance, not arrival in an inbox." },
      { date: "9 Oct", lead: "A customer query exposed a search that only seemed to work.", text: "Law Expert's section filters, Slovak word forms and search coverage were repaired. The repaired adapter found 204 results for the reported query against live court sources. The stronger research model came after retrieval was fixed." },
    ],
    unlocked:
      "A completed build is only one step. The line now asks whether the intended page is live, whether its buttons lead somewhere, and whether the email provider accepted the handoff — while keeping the limits of that proof visible.",
  },
];

/** OTH-222: a separate snapshot; every earlier entry and count stays frozen.

/** 9–12 October 2026 (factory-web `RECORD_UPDATE_2026_10_12`). */
export const RECORD_UPDATE_2026_10_12: Era[] = [
    {
      numeral: "XV",
      dates: "9–12 October",
      scale: "4 days · 179 commits",
      kind: "human",
      title: "A smaller line, a clearer bill",
      tagline: "One way to start. Measured tokens to change it. A release still has to reach the page.",
      lede:
        "The next changes removed choices that had become accidental: a visitor still landing in the old wizard, a customer buying an abstract credit, a release testing work the same tree had already passed. The factory became more explicit about what starts a job, what the customer pays for, and which version actually goes live.",
      entries: [
        { date: "9 Oct", lead: "The chat became the front door.", text: "Every start-a-project button now opens the same scripted conversation. The wizard-versus-chat experiment closed; its stored results stayed frozen, and a new counter follows the chat alone. The chat's meter keeps model tokens at zero until a model actually runs." },
        { date: "9 Oct", lead: "One prototype build at a time by default.", text: "The factory gained a shared queue: a lock on each prototype had never limited how many different prototypes could build together. Duplicate requests are refused, and waiting work remains recoverable after a restart. This is a capacity guard, not evidence of a completed conference load test." },
        { date: "10 Oct", lead: "A green quality gate did not mean a release.", text: "An earlier main run passed the website's quality gate, failed other required jobs and skipped deployment. CI now reuses a successful pull request's tested tree instead of repeating its tests on main. The production build and deployment still have to succeed." },
        { date: "10 Oct", lead: "Terms that actually open.", text: "The missing terms page was added, the privacy notice names the company and its processors, and registration asks for consent. The project chat gained an explicit AI notice. These are delivered pages and controls, not a claim that legal review is complete." },
        { date: "11 Oct", lead: "Tokens replaced credits.", text: "The website gained a token wallet, a purchase window and prices calculated by the server. The change flow reserves tokens, settles recorded usage on completion and releases the reservation after a terminal failure. The pricing page is live; that alone does not establish a successful live payment or revenue." },
        { date: "11 Oct", lead: "A task can name its engine and its starting state.", text: "The founder's new-task chat can choose Claude or Codex and Backlog or Prioritized. A release guard also learned to update a branch that falls behind main and wait for fresh proof. Staging deploys the merged target branch, after the old feature checkout could omit newer work." },
        { date: "11 Oct", lead: "The template moved ahead of its public demo.", text: "Listings and owner contact fields were followed by an optional map and a repair for a map worker that loaded HTML instead of map data. Those changes are in template history. The public Golden demo still names an older revision; a template commit is not proof that every existing prototype was refreshed." },
        { date: "12 Oct", lead: "Model recommendations stopped being a cage.", text: "The founder's agent settings moved to the leaderboard. Each role can choose across the available model catalogue, with the recommended tier marked rather than enforced as the only choice. The local-model restriction for autonomous projects remains." },
      ],
      unlocked:
        "The customer has one route into the factory and a bill expressed in tokens. The founder can choose how a task starts. The lesson from the release failures stays the same: tested code, deployed code and a page a visitor can read are separate pieces of evidence.",
    },
];
