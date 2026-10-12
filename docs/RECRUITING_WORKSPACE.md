# CV Matcher — recruiting workspace (2026-10-12)

The prototype at `apps.tokenwise.sk/newapp/cv-matcher` grew from a single CV ↔ job
scoring page into a browser-only recruiting workspace for solo headhunters and small
agencies. This document records what was researched, what was built, what was left out
and why, and how to present it. Claims are tagged [FAKT] / [INFERENCIA] / [OVERIŤ].

## 1. Research: what a recruiting system for a small desk must cover

Sources (2026-10-12, vendor material unless noted; treat feature claims as starting points):
ATS roundups ([Capterra](https://www.capterra.com/applicant-tracking-software/),
[SelectSoftwareReviews](https://www.selectsoftwarereviews.com/buyer-guide/applicant-tracking-systems),
[Recruitable](https://www.recruitablehr.com/blog/15-best-applicant-tracking-systems/),
[Atlas](https://recruitwithatlas.com/blog/best-applicant-tracking-systems/)); agency CRM comparisons
([Spott](https://spott.io/resources/top-10-ats-and-crm-platforms-for-recruiting-agencies-in-2026),
[Truffle](https://www.hiretruffle.com/blog/best-staffing-crms),
[Leonar](https://www.leonar.app/blog/best-ats-crm-software-recruiting-agencies/)); KPI guides
([Recruiterflow](https://recruiterflow.com/blog/recruiting-metrics/),
[RecruitBPM](https://recruitbpm.com/blog/how-to-measure-recruitment-kpis),
[NetSuite](https://www.netsuite.com/portal/resource/articles/human-resources/recruitment-kpi.shtml));
process ([Recruiterflow workflow](https://recruiterflow.com/blog/recruiting-workflow/),
[ASE direct hire](https://www.aseonline.org/Talent-Acquisition/Direct-Hire)); fees and guarantees
([Pin](https://www.pin.com/blog/recruitment-agency-commission-structures/),
[Nigel Wright](https://www.nigelwright.com/uk/fees-pricing-faqs),
[Beancount](https://beancount.io/blog/2026/07/16/contingency-retained-search-recruiter-guarantee-refund-liability-bookkeeping-guide));
GDPR ([GDPR Advisor](https://www.gdpradvisor.co.uk/data-protection-for-recruitment-agencies-cv-retention-policies),
[Yena](https://www.yena.ai/blog/gdpr-candidate-data-retention-recruitment-2026),
[nflo](https://nflo.tech/knowledge-base/gdpr-in-recruitment-cv-retention/)); Slovak placement
licensing ([zákon 5/2004 via 573/2005](https://www.zakonypreludi.sk/zz/2005-573)); AI screening
([Sapia](https://sapia.ai/resources/blog/resume-screening-software/),
[Canditech](https://www.canditech.io/blog/ai-recruiting-tools/)).

What the sources agree on, and what the workspace does with it:

| Area | What small agencies need [INFERENCIA from sources] | In the workspace |
|---|---|---|
| Process | Brief → sourcing → screening → submittal → client interview → offer → placement → onboarding/guarantee | Six fixed stages (`sourced → screening → submitted → interview → offer → placed`) + `rejected`; same for every job so reports compare |
| Clients (CRM half) | Company, contact, fee terms, payment terms, open jobs, placements, revenue per client — the thing in-house ATS lacks | `Clients` with fee %, guarantee days, payment terms; open jobs, placements with invoice state, fees |
| Jobs | Brief with salary range, must-have vs nice-to-have, priority, deadline, owner, fee | `Jobs` with all of it; job library (OTH-104) loads a posting; fee estimate = salary midpoint × fee |
| Candidates | Pool with source, skills, tags, notes timeline, last contact, CV on file | `Candidates` with CV import (PDF/DOC/DOCX, OTH-103) that pre-fills name, contacts and skills; timeline of calls/e-mails/notes |
| Pipeline | Kanban with adjustable stages, days in stage, stale alerts — the most-used screen | `Pipeline` board, drag-and-drop or menu, days in stage, stale marker after N days (setting) |
| Matching | Keyword → semantic matching; score with evidence, never a decision | The existing analyzer (OTH-85) scores any application; job drawer ranks the pool; score saved with the application |
| Interviews | Scheduling, calendar, structured scorecards with the same criteria per job (bias reduction) | Schedule, `.ics` export, scorecard 1–5 on five criteria + recommendation + client summary |
| Placements & money | Contingency fee 15–25 % of first-year salary (20 % typical), guarantee 30–90 days with replacement, retained in thirds | Placement = salary × fee %, guarantee window, invoice draft/sent/paid; defaults per client and workspace |
| KPIs | Time to fill, time to first submittal, submittal→interview ratio, fill rate, source of hire, revenue per client, pipeline value | `Reports`: funnel with conversions, time to fill, days in stage, sources → placed, fees by client and month, weighted fee pipeline |
| GDPR | Storage limitation; consent for talent-pool retention (≈12 months typical); export on request; delete or anonymize; never a statutory "7-year" rule for CVs | Consent per candidate with expiry (setting, default 12 months), 30-day warning, export JSON, anonymize keeping statistics, withdraw |
| Slovak specifics [OVERIŤ] | Fee-based placement needs a ÚPSVaR permit and monthly reporting of placements on the office's forms (zákon 5/2004 § 25–28) | Not modelled; `Reports` + CSV export give the numbers. A ÚPSVaR report template is a follow-up |

Left out on purpose (small-desk scope): job-board multiposting, e-mail/SMS sequencing,
LinkedIn sourcing integrations, timesheets/payroll for temp desks, multi-user permissions,
client portal. Each is an integration or a server, and this prototype has neither.

## 2. What was built

- **Data model** (`lib/recruiting/model.ts`): clients, jobs, candidates, applications (with
  stage history), interviews (with scorecards), placements, tasks, activities, settings.
- **Store** (`lib/recruiting/store.ts`): one workspace in `localStorage`
  (`cv-matcher:workspace:v1`), `useSyncExternalStore`, cross-tab `storage` sync, export/import
  JSON. The demo is seeded on first visit (`seed.ts`, EN or SK by the URL's language) with dates
  relative to "now", so interviews are always "today" and a placement is always in guarantee.
- **Actions** (`lib/recruiting/actions.ts`): every change is a named function that also writes
  the timeline (stage change, rejection with reason, placement, consent, anonymization).
- **Metrics** (`lib/recruiting/metrics.ts`): pure; the overview's attention list and KPIs and
  every report compute from a workspace and a clock. Tested in `tests/recruiting-logic.spec.ts`.
- **Views** (`components/recruiting/*`): overview, pipeline, candidates, jobs, clients,
  interviews, matcher (the original tool, workspace-aware), reports, settings; an application
  drawer shared by pipeline, candidate and job; drawers are bottom sheets on phones.
- **Shell** (`components/recruiting/shell.tsx`): sidebar from `lg`, four-tab bar + "More" on
  phones, global search. Routes under `/workspace/*` in both locale trees; `/analyze` and
  `/dashboard` still work (matcher page; redirect to the workspace after sign-in).
- **Landing**: this prototype's own hero and closing band (`components/sections/recruiting-*`)
  with two Gemini illustrations (`public/images`, `gemini-3.1-flash-image`, one call each,
  2 of 3 prompts returned an image); every other section is the template's, driven by
  `prototype.config.json` (how it works, features, use cases, comparison, FAQ, contact).
- **Copy**: EN default + SK in `lib/recruiting/copy.ts`; the Slovak object is typed against
  the English one, so a missing string is a type error.

## 3. Decisions

- **Browser-local data, not Firestore.** [FAKT] factory-web's rules let a visitor write only
  `demos/{slug}/users/{uid}/records` (≤ 12 keys, 200 records) — too narrow for seven entities,
  and a demo for a presentation must open instantly without sign-in. The storage adapter is
  one module (`store.ts`); a cloud sync per account is the next step when a customer wants
  shared desks. Documented in the UI (Settings, FAQ) — never implied to be cloud-synced.
- **Six fixed stages.** Configurable stages were considered and rejected for the prototype:
  every KPI (funnel, days in stage, conversion) depends on comparable stages, and the sources
  agree the small-agency funnel is standard. Stage names are copy, not data.
- **The matcher stays a screening aid.** Scores are shown with the matched/missing skills,
  saved only when the recruiter clicks; no automatic rejection. The FAQ says so.
- **Template merge first.** `demo/cv-matcher` was 32 commits behind the template; the VM's
  `prototypes:refresh` merges `main` and refuses conflicts outside the config, so the merge
  (package.json, lockfile, .gitignore, globals.css) is part of this change. The branch now has
  the story landing, the "Edit texts" panel and the AI footer disclaimer like every other
  prototype.
- **Images: two, static, WebP.** Not the AI hero-image feature (that is per-visitor,
  server-side, and the founder decided text contrast is not guaranteed); a fixed illustration
  with a left-side gradient keeps the headline readable in every palette.

## 4. How to present it (solo headhunter, 2–5 person agency)

1. Landing → "Open the demo workspace". No sign-in.
2. Overview: today's interview, the stale process, the consent expiring in 20 days, the
   overdue task — "this is Monday morning".
3. Pipeline: drag L. Nagy from interview to offer; open A. Bieliková → "Create placement"
   → fee computed (64,000 × 20 %), guarantee until date, job marked filled.
4. Candidates: "Add candidate" → upload `tests/fixtures/cv/resume.pdf` → name, e-mail, skills
   filled; consent checkbox; add to the Frontend job.
5. Jobs: open the Frontend job → "Find matches" → the pool ranked → add one.
6. Interviews: scorecard for today's client interview; `.ics` export.
7. Reports: funnel, time to fill, fees by client; CSV for the accountant.
8. Settings: export JSON (data stays with the recruiter), reset to demo.
Slovak: the same at `/sk/workspace`.

## 5. Follow-ups

- Cloud sync per signed-in account (shared desk for an agency) — needs its own Firestore
  rules in factory-web; the store's adapter is the seam.
- ÚPSVaR monthly placement report template (SK) from `placements` [OVERIŤ the current form].
- E-mail templates (submittal to client, interview invite) — copy only, `mailto:` first.
- The retired `hero-image` controls are not rendered on this landing; the "Edit texts"
  panel is.
