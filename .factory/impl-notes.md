All changes are complete and verified. Message-bundle parity passes, JSX is consistent, and the refresh wiring links the parser to the grid.

## Changes
- `components/features/quota-countdown.tsx` (NEW): Prominent, fully-controlled Live Quota Countdown card. Green "all models active" vs amber "Claude sleeping (waiting for reset)" status pill, ticking `HH:MM:SS` display, and preset controls — "3:00 AM" (next occurrence), "+5 hours", a `datetime-local` custom picker, and clear. Clock starts in an effect so SSR/first-client render agree (no hydration mismatch). Touch targets ≥ 44px.
- `components/features/quick-log-parser.tsx` (NEW): "Quick Log Import" field + "Analyze & add" button. Pure `parseTerminalLog()` detects the agent (Claude Code / OpenAI Codex / Continue) and a reset time from strings like `resets 3am`, `resets 3:00 AM`, `try again at 03:00`, or `try again at Sep 30, 2026, 2:55 AM`. Creates a Firestore record via `useRecords().addRecord` with status `Waiting for Reset`, pushes any detected time to the shared countdown, and signals the grid to refetch. Firestore errors never surfaced raw.
- `components/patterns/data-grid/index.tsx` (MODIFY): Added color-coded `StatusBadge` (emerald Active / zinc Paused / amber Waiting for Reset / blue Completed, neutral fallback) rendered for the `status` field; Status + Agent filter dropdowns (shown only when those fields exist, options from config); filtered desktop table + mobile cards with a "no match" empty state; and a `refreshSignal` prop to refetch after a sibling writes.
- `app/[locale]/dashboard/page.tsx` (MODIFY): Mounts `QuotaCountdown` at the top, `QuickLogParser` above the grid, and shares `resetTarget` + `refreshSignal` state between them and `DataGrid`.
- `components/features/index.ts` (MODIFY): Exports the two new components and helpers.
- `messages/{en,sk,cs,de,pl,hu,fr,es}.json` (MODIFY): Added `quota`, `logParser`, and `gridFilter` namespaces to all 8 bundles (verified identical deep key sets so `tests/locale.spec.ts` parity passes — the prior round's config-section failure was unrelated and `patterns.landing.sections` is left untouched).

## Deploy Components
- hosting: true
- firestore-rules: false
- firestore-indexes: false
- functions: false

## Notes
- No `prototype.config.json` changes — the Session entity already declares `agent`, `status` (with the four required options), `startedAt`, `mode`, `task`, so the parser's writes and the filters work against the existing schema.
- User-facing strings go through next-intl (golden rule 4). The dashboard is auth-gated, so these components aren't reachable by the existing e2e suite; validation rests on build/typecheck plus the bundle-parity test, which I confirmed passes.
- The parser and grid each use their own `useRecords` instance; the `refreshSignal` prop bridges them so a newly parsed session appears in the grid without a reload.