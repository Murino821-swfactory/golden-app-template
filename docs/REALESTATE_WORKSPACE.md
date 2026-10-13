# Realitný maklér — workspace for agents and agencies (2026-10-13)

The prototype at `apps.tokenwise.sk/newapp/realitny-makler` grew from a listings page with
a map and an inquiry form into a browser-only workspace for real estate agents and
agencies in Slovakia: the whole path of a sale or a lease, the people around it, and the
compliance the law asks of an agent. This document records what was researched, what was
built, what was left out and why, and how to present it. Claims are tagged
[FAKT] / [INFERENCIA] / [OVERIŤ].

## 1. Research: what an agent's or an agency's system must cover

Sources (2026-10-13, vendor material and secondary legal commentary unless noted — feature
claims are starting points, legal claims need a lawyer):
real estate CRM roundups ([The Close](https://theclose.com/best-real-estate-crm/),
[Creatio](https://www.creatio.com/real-estate), [crm.org](https://crm.org/crmland/best-real-estate-crm-software-2020-reviews-pricing),
[Wise Agent pipeline](https://www.destinationcrm.com/Articles/CRM-News/CRM-Across-the-Wire/Wise-Agent-Launches-Lead-Pipeline-173950.aspx),
[Capterra 8020CRM](https://www.capterra.com/p/10023718/8020CRM/reviews/)); brokerage KPIs
([PropertyMe](https://www.propertyme.com.au/blog/sales/the-real-estate-sales-performance-index),
[Qobrix](https://qobrix.com/blog/articles/real-estate-agency-kpis-to-track),
[Ajelix](https://ajelix.com/bi/real-estate-kpis/), [Toucan Toco](https://www.toucantoco.com/en/blog/real-estate-kpis),
[Realtair](https://realtair.com/?p=2376)); transaction checklists
([Process Street](https://www.process.st/templates/residential-real-estate-transaction-management-template/),
[SafetyCulture](https://safetyculture.com/checklists/maintenance/real-estate-transaction),
[Hello Homes Sitges](https://www.hellohomessitges.com/guides/real-estate/real%20estate%20sale-steps-stages));
rental management ([SimplifyEm](https://apps.simplifyem.com/property_management_software_content/managing_tenant_lease_info),
[Dialog Soft4RealEstate](https://dynamics.dialog.com.au/partners/soft4realestate/),
[LeaseBase](https://www.softwareadvice.com.au/software/551128/LeaseBase)); the Slovak sale process and contracts
([ddadsstornala.sk](https://ddadsstornala.sk/aktuality/vysporiadanie-majetku-agentura/),
[reservation vs brokerage agreement](https://ddadsstornala.sk/aktuality/rezervacna-a-sprostredkovatelska-zmluva/),
[exclusive agreement](https://ddadsstornala.sk/aktuality/zmluva-o-sprostredkovani-vyhradna/));
AML duties of an agent ([podnikajte.sk](https://www.podnikajte.sk/zakonne-povinnosti-podnikatela/povinnosti-aml-zakon-15-3-2018),
[zssambra.sk](https://zssambra.sk/blog/zakladna-starostlivost-o-klienta-sa-vykona-vzdy/),
[FSJ guidance on remote identification](https://www.minv.sk/swift_data/source/policia/fsj_biro/usmernenia/Identifikacia%20klienta%20bez%20fyzickej%20pritomnosti%20a%20pouzitie%20par%2012%20zakona.pdf));
energy certificates ([nehnutelnosti.sk magazine](https://www.nehnutelnosti.sk/magazin-o-byvani/87592-energeticky-certifikat-bytu-pri-predaji-co-vam-hrozi-ak-ho-nemate-a-na-co-si-dat-pozor),
[zákon 555/2005](https://www.zakonypreludi.sk/zz/2005-555/znenie-20170101));
commissions ([AKMV](https://www.akmv.sk/ako-pracuju-realitne-kancelarie-na-slovensku)).

What the sources agree on, and what the workspace does with it:

| Area | What agents and agencies need [INFERENCIA from sources] | In the workspace |
|---|---|---|
| Listings | Property records with facts, photos, documents, price history, exclusivity, days on market, the portals they are published on; a Slovak listing must state the energy class ([OVERIŤ] fines 500–3 000 € for agencies) | `Properties`: facts, cadastre (LV, parcel), six documents incl. energy certificate and brokerage agreement, portals matrix, price history, matching demand, viewings, deals; the overview flags a live listing without a certificate |
| Clients (CRM half) | Owners, buyers, landlords, tenants with source, tags, timeline; GDPR consent; AML identification — an agent is an obliged person under zákon 297/2008 § 5 ods. 1 písm. i): identify the client before the transaction, verify against the ID, PEP check | `Clients` with roles, consent with expiry (default 36 months) and one-click export, AML status none → identified → verified with method/document/PEP, timeline |
| Demand and matching | Inquiries from portals, web, referrals; speed to lead is the first KPI; matching demand to supply is the expected "complex" feature of Czech/Slovak agency software | `Demand`: criteria, source, SLA flag after N hours (setting), score 0–100 against the portfolio on type, location, budget (±10 %), rooms, area, must-haves; schedule a viewing or open a deal from the match |
| Viewings | Appointments with outcome and feedback; lead-to-viewing and viewing-to-offer conversions | `Viewings`: agenda (today/tomorrow/week/later/past), `.ics` export, outcome + feedback, no-show, cancel |
| Transactions | Reservation with deposit → contracts (notarised) → mortgage and bank lien → cadastre filing (návrh na vklad) → price release → handover with meter readings and keys; office-wide templates so every agent follows the same steps | `Deals` on a rail: offer → reservation → contracts → financing → cadastre → handover → closed (rentals skip financing and cadastre); 18/12 checklist items per station; AML of both parties flagged before the contracts; reservation deposit and deadline; financing bank and approval; a signed document ticks its item; close = property sold/rented, demand won |
| Rentals | Lease terms, deposit, rent reminders and collection, meter readings, move-in/move-out protocols, renewal | `Leases`: rent payments due on the 5th with overdue flags, deposit, notice period, protocols with electricity/gas/water and keys, days to end, renewal task |
| Documents | Brokerage agreement (exclusive/non-exclusive), reservation, purchase, lease, handover protocol, cadastre filing, GDPR consent, AML form, power of attorney | `Documents`: ten templates rendered from the record's data in SK and EN, draft → sent → signed → archived, print to PDF; always marked "not legal advice" |
| Money | Commission 2–4 % of the sale price or one month's rent, VAT (23 % in Slovakia), agent splits, GCI per agent, pipeline forecast | Commission basis (%, fixed, months), payer, VAT and agent split on every deal; weighted pipeline by station probability; monthly statement per agent |
| Team | Roles, who carries what, oversight of stalled deals | `Team` (agency mode): roles, split, listings, open/won deals, GCI, "work as this person"; solo mode hides it |
| KPIs | Lead conversion, lead-to-viewing, listings per appraisal, days on market, closed-sales rate, GCI per agent | `Reports`: funnel with conversions, average days on market, commission by month, by agent, demand by source, inventory by status, pipeline by station, rent roll, CSV export |
| Marketing | Portal syndication (XML feeds) is the expected export; listing texts and social posts | `Marketing`: publication matrix listings × portals, per-portal counts, views/inquiries, portal and social texts from the facts; feeds named as the next integration, not claimed |

Left out on purpose: XML feed export to the portals, e-mail/SMS sequences, e-signature, bank or
cadastre APIs, photo storage, a public website generator, multi-user permissions with a server.
Each is an integration or a server, and this prototype has neither.

## 2. What was built

- **Data model** (`lib/realestate/model.ts`): properties, contacts (consent + AML), demands,
  viewings, deals (rail, checklist, commission, reservation, financing), leases (payments,
  protocols), documents, tasks, agents, activities, settings. All plain JSON.
- **Store** (`lib/realestate/store.ts`): one workspace in `localStorage`
  (`realitny-makler:workspace:v1`), `useSyncExternalStore`, cross-tab sync, JSON export/import.
  The demo is seeded on first visit (`seed.ts`, EN or SK by the URL's language) with dates
  relative to "now", so there is always a viewing today, a reservation expiring in 5 days, a
  lease ending in 45 days, an overdue rent and an inquiry past the response time.
- **Actions** (`lib/realestate/actions.ts`): every change is a named function that also writes
  the timeline; moving a deal keeps the listing's status in step (reserved, sold, rented).
- **Metrics** (`lib/realestate/metrics.ts`): matching, commission, KPIs, the attention list
  (12 kinds), funnel, days on market, money by month, by agent, by source, inventory,
  statements. Pure; tested in `tests/realestate-logic.spec.ts`.
- **Documents** (`lib/realestate/documents.ts`): ten templates rendered from the linked record.
- **Views** (`components/realestate/*`): overview, properties, contacts, demands, viewings,
  deals (board with drag-and-drop and a drawer with the rail), rentals, documents, tasks,
  marketing, team, reports, settings; drawers are bottom sheets on phones.
- **Shell** (`components/realestate/shell.tsx`): sidebar from `lg`, four-tab bar + "More" on
  phones, search, the persona selector ("working as"), `?mode=solo|agency` from the landing.
  Routes under `/workspace/*` in both locale trees; `/dashboard` redirects after sign-in.
- **Landing**: this prototype's own hero (the rail lit in sequence on load, a listing dossier
  on the Gemini interior) and closing section (solo vs agency plans, the keys photograph);
  every other section is the template's, driven by `prototype.config.json` (how it works,
  features, use cases, comparison, FAQ, contact).
- **Copy**: EN default + SK in `lib/realestate/copy.ts`; the Slovak object is typed against
  the English one, and a test walks both trees key for key.

## 3. Decisions

- **Browser-local data, not Firestore.** [FAKT] factory-web's rules let a visitor write only
  `demos/{slug}/users/{uid}/records` (≤ 12 keys, 200 records) — too narrow for ten entities,
  and a demo for a presentation must open without sign-in. `store.ts` is the seam for a
  per-account cloud desk. The UI says so (Settings, FAQ); nothing claims cloud sync.
- **A fixed rail.** Configurable stages were rejected: every forecast, report and checklist
  depends on comparable stations, and the Slovak sale process is standard (reservation →
  contracts → financing → cadastre → handover). Station names are copy, not data.
- **Compliance shows, it does not block.** Moving a deal with open checklist items is allowed;
  the drawer says how many items block the next station and the overview flags missing AML
  before the contracts. A tool that refuses to move a card gets worked around in a notebook.
- **Documents are drafts.** Clauses are demo-grade and bilingual, filled with real numbers;
  every rendering carries "not legal advice — a lawyer must review". No validity is claimed.
- **No prices on the plans.** The landing presents Solo and Agency as two ways to work with the
  same demo. Pricing is the founder's decision and is not invented here.
- **Template merge first.** `demo/realitny-makler` was 2 commits behind the template; the VM's
  `prototypes:refresh` merges `main` and refuses conflicts outside the config, so the merge is
  part of this change (clean). The branch overrides `app/[locale]/page.tsx` (registry),
  `app/[locale]/dashboard/page.tsx` and `app/globals.css` (rail animation + print); on a future
  refresh conflict keep the branch's side.
- **Images: three, static, WebP.** `gemini-3.1-flash-image`, one call each (3 of 3 returned):
  the street at dusk (hero backdrop), the renovated interior (dossier card), the keys on a
  contract (closing band; the paper's text softened with a radial blur so no invented names
  read as real). Not the AI hero-image feature — that stays available to the creator and the
  founder and replaces the static backdrop in the same layer.
- **`listings` pattern dropped from the config.** The landing sells the workspace, not a
  catalogue. The VM refresh gate runs the plain `validate:config` (production validation is
  the new-build pipeline's), so the composition is accepted, as it was for `demo/cv-matcher`.

## 4. How to present it (solo agent, agency owner)

1. Landing → "Open the demo workspace" (or a plan card: "as an agent" / "as an owner").
2. Overview: the inquiry unanswered for 30 h, today's two viewings, the reservation expiring
   in 5 days, the stale mortgage, the overdue rent, the consent expiring in 20 days — "this is
   Monday morning". Switch "My desk" ↔ "Whole agency".
3. Properties: open Trávniky — energy certificate missing (tick it), topreality queued → live,
   Lukáš Urban matches at 100 % → schedule a viewing.
4. Demand: Filip Bielik — mark contacted; Alena Tóthová — the Košice flat ranks first.
5. Deals: drag Panenská from reservation to contracts; open Senec — tick "mortgage approved"
   and "bank lien registered", the station completes, move to cadastre; commission 9 360 €,
   VAT, Zuzana's share.
6. Leases: Vyšehradská — mark this month paid; Mierová (ended) — move-in and move-out
   protocols with meter readings.
7. Documents: generate a purchase contract for Senec, preview, print to PDF, mark signed —
   the deal's checklist item ticks itself.
8. Team (agency mode): splits, GCI year to date, Martin's statement for last month; "work
   as Petra" and watch the overview change.
9. Reports: funnel, days on market, commission by month, CSV for the accountant.
10. Settings: Solo mode (team disappears), export JSON, reset to demo.
Slovak: the same at `/sk/workspace`.

## 5. Verification

- `npm run typecheck`, `npm run lint`, `npm run validate:config` (the refresh gate's check):
  clean.
- Playwright against the static export, chromium desktop + mobile: see the PR description
  for the run's numbers (`tests/realestate-logic.spec.ts`, `tests/realestate.spec.ts` plus the
  unchanged template suite).

## 6. Follow-ups

- Cloud sync per signed-in account (shared desk for an agency) — needs its own Firestore
  rules in factory-web; `store.ts` is the seam.
- XML feed export to nehnutelnosti.sk / reality.sk / topreality.sk [OVERIŤ each portal's
  feed contract and pricing for agencies].
- E-mail templates (viewing confirmation, reservation deadline reminder) — copy first, `mailto:`.
- Photo storage and a listing sheet (PDF) per property.
- Pricing of the Solo and Agency plans — founder's decision; the cards have no numbers.
- The template's `pricing` section remains locked for hand-written configs; if the founder
  wants prices on the landing they go into `lib/realestate/copy.ts` → `landing.plans`.
