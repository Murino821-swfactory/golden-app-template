# GitPulse Studio — the growth plan (`/growth`)

**Branch:** `demo/gitpulse-studio` · **Live:** https://apps.tokenwise.sk/newapp/gitpulse-studio/growth
(`/cs/growth` in Czech) · **Since:** 2026-10-17

The improvement plan for tokenwise.sk and `@tokenwisefactory` (founder's document of
2026-10-17: website, Instagram, content plan, reels, stories, captions, strategy, lead
e-mails, weekly reporting — "main goal: make the site trustworthy") implemented as a
working tool inside the prototype, next to the studio (`docs/STUDIO.md`). Four panels, the
studio's publish bar under them; nothing leaves the browser except what the bar hands to the
share sheet or the mail client.

| Panel | What it is | Where the plan's words came from |
|---|---|---|
| **Content plan** | Seven slots a week (Mon post · Tue reel · Wed story · Thu post · Fri video · Sat reel · Sun article) + a daily story, filled from an idea bank of 15 ideas in four pillars (educational, about Tokenwise, free value, proof). The pick rotates with the week, deterministically. A slot is ticked off when the bar publishes it (the log's `ref`). | "Content plan", "Instagram Reels" (Shopify site, build → use → result), "Instagram Stories", "Nápad na video", "Caption" (every caption ends with the product and the link), "YouTube → Reels/TikTok", "SEO content" (the tokenwise.sk channel) |
| **Instagram profile** | Name, three bio variants (≤ 150), five story highlights in order (Apps · Results · About · FAQ · Start, titles ≤ 15), the fresh-start checklist (bio, name, logo, archive, three posts, highlights, friends, follow-for-follow, 14 days daily), the strategy list. Ticks live in `localStorage`. A highlight goes to the bar as a story. | "Instagram" (bio, name, logo, start over: who we are / what we do / how you can do the same), "Story highlights", "Stratégia" |
| **Weekly report** | Computed every time it opens: what went out this week from the publish log (by shape — post / story / reel / video / article — and by channel), the week's numbers typed in (reach, followers, site visits, registrations) with deltas against the week before, weekly and monthly goals with progress, and a suggestion for next week (a met goal grows by a fifth). Markdown download; the report is also a build-in-public post in the bar. | "Weekly reporting" — results, people reached, impact on registrations, pieces created, goals for next week + the monthly goal |
| **Leads & offers** | Leads from three doors (contacted us, newsletter, has an account), each with its sequence: welcome → value e-mail → offer → reminder, due a number of days after the lead arrived. A due step opens in the mail client (`mailto:` with subject and body) and is ticked off; the offer carries the token coupon code when one is set. | "Implementácia AI" — leads, informative e-mails with real value, offers, reminders, promo coupons for tokens |

The **landing** got the plan's website items that the template can carry honestly: a longer
page with *How it works* (four steps) and *Questions before you start* (five answers) before
the call to action, a feature tile for the growth plan, and copy that leads with what the
visitor gets. The template's `testimonials` section stays off: it has no content slice
(placeholder quotes only) and there are no customer reviews to quote — the proof on this
page is the live projects list, which is real.

## Why it is built this way

- **No tokens, no server.** The report is arithmetic over data the browser already holds,
  the plan is a rotation, the e-mails are templates. The generation layer (`/create`) stays
  the place where money is spent, on demand.
- **No invented claims.** Bios, ideas and e-mails say what the factory can show: live
  projects, the git record, token prices on screen, a human approving releases. No clients,
  no reviews, no prices (`sw-factory` memory: customer claims limits).
- **The bar is the only door out.** The same `PublishBar` as `/studio`, with the same log
  (`gitpulse.publish-log.v1`) — so the report counts the studio's publishes too. A publish
  from the plan carries `kind` (the shape) and `ref` (the idea), two optional fields added
  to `ScenarioContent` and `PublishLogEntry`.
- **Sending e-mail honestly.** A static prototype has no mail server and holds no secrets;
  `mailto:` puts the finished e-mail in the founder's own client. The coupon code must exist
  in Stripe before it goes into an e-mail — the field says so.

## Where the code is

```
lib/growth/
  copy.ts      EN + CS — the plan's words (ideas, bios, highlights, checklist, e-mails, report)
  plan.ts      idea bank, weekly slots, rotation, ideaContent → ScenarioContent
  profile.ts   bio / highlight limits, checklist, highlightContent
  report.ts    buildReport, reportMarkdown, reportContent
  leads.ts     sequences, due steps, emailFor, mailtoUrl
  store.ts     localStorage values (checklist, metrics, goals, leads, coupon)
components/growth/
  growth.tsx (tabs + bar)  plan-panel.tsx  profile-panel.tsx  report-panel.tsx  leads-panel.tsx
  growth-link.tsx (dashboard door)
components/studio/use-publish-receipt.ts   the receipt (log + queue), shared with the studio
app/[locale]/growth/ + app/(default)/growth/   routes, per-language metadata
tests/growth-logic.spec.ts (rules)  tests/growth.spec.ts (the page, desktop + mobile)
```

Template files touched: `prototype.config.json` (sections `howItWorks` + `faq` with copy,
one feature tile, dashboard intro, CTA subtitle) and `app/[locale]/dashboard/page.tsx` (one
`<GrowthLink />`). On a template refresh with conflicts, keep this branch's side of those two.

## Demo script (3 minutes)

1. Open `/growth`. The week's seven slots; the first is already in the bar. Press
   *Previous week* / *Next week* — the ideas rotate.
2. Pick Tuesday's reel → the bar re-words the caption (it ends with the product line and
   the link). Choose **Instagram**, publish. The slot shows *Published*.
3. **Instagram profile**: copy a bio, open *Apps* as a story, tick *Replace the bio*.
4. **Weekly report**: type reach 1 200 and registrations 6 — two goals turn *met*, the
   suggestion grows them by a fifth. *Download as Markdown*. *Open in the publish bar* —
   the report is a post.
5. **Leads & offers**: set the coupon code, add a lead with *Has an account* — the welcome
   is due today; *Open e-mail* starts the mail client with it filled in; *Mark sent*.

## Republish

After the merge (merge commit, never squash): `npm run prototypes:refresh -- --republish
--only gitpulse-studio` on the VM.
