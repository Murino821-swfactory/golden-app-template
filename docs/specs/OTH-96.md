## Process Log

### Turn 1: Scope Identification
SCOPE:
- Type: MODIFY & NEW
- Layers: frontend, components, dashboard layout
- Primary files:
  - `components/features/quota-countdown.tsx` (NEW — Live Quota Countdown card)
  - `components/features/quick-log-parser.tsx` (NEW — Quick Log Import parser)
  - `components/patterns/data-grid/index.tsx` (MODIFY — Status badges & Agent/Status filtering)
  - `app/[locale]/dashboard/page.tsx` (MODIFY — Embed Countdown card and Log Parser into dashboard layout)
- Dependencies: `useRecords` hook (`hooks/use-records.ts`), `prototype.config.json` entity field definitions
- Integrations: Firestore collection via `useRecords()`

### Turn 2: Codebase Exploration
CODE UNDERSTANDING:
- Implementation pattern: Dashboard in `app/[locale]/dashboard/page.tsx` mounts `Stats`, `MapBase` (if present), and `DataGrid`. `DataGrid` fetches per-user records via `useRecords()`. The entity keys are `agent`, `status`, `startedAt`, `tokensUsed`, `mode`, `task`.
- Constraints: Dark theme only (`dark-only`). Mobile-first responsive layout (touch targets ≥ 44px). Compatible with static export (`output: 'export'`). Standard Tailwind CSS variables.
- Conventions: Component exports in `components/features/`, standard UI components in `components/ui/`.
- Integration points: Dashboard top section gets `QuotaCountdown` and `QuickLogParser`. `DataGrid` status field gets visual badges and filter dropdowns.

### Turn 3: Memory/Knowledge
LESSONS:
- Similar issues: No similar issues found.
- Patterns to reuse: `StatCard` pattern (`components/features/stat-card.tsx`), `useRecords()` hook for creating/fetching records.
- Anti-patterns: No failure lessons found.

---

## Scope
- Type: MODIFY & NEW
- Layers: frontend (Next.js components, page routes)
- Files:
  - `components/features/quota-countdown.tsx` — Prominent live countdown card, active status indicator, quick reset target controls (03:00 AM, +5h, custom picker).
  - `components/features/quick-log-parser.tsx` — Quick log import input & parser button, regex parser for terminal rate-limit errors, auto-creating a record with "Waiting for Reset" status.
  - `components/patterns/data-grid/index.tsx` — Status badge renderer with custom color coding and Status + Agent filter controls.
  - `app/[locale]/dashboard/page.tsx` — Mount `QuotaCountdown` and `QuickLogParser` onto the `/dashboard` screen.
  - `components/features/index.ts` — Export `QuotaCountdown` and `QuickLogParser`.
- Dependencies: `useRecords` (`hooks/use-records.ts`), `Button` (`components/ui/button.tsx`), `Input` (`components/ui/input.tsx`), `Card` (`components/ui/card.tsx`).

## Approach
1. Create `QuotaCountdown` feature component:
   - Maintains state for target reset time (defaulting to next 3:00 AM or user-set date/time).
   - Ticks down every second via `setInterval`.
   - Displays state indicator:
     - Green dot + text: "Všetky modely aktívne" / "All models active" (when reset target is null or in the past).
     - Amber dot + text: "Claude v režime spánku (čaká na reset)" / "Claude sleeping (waiting for reset)" (when reset target is in the future).
   - Provides quick set controls: "03:00 AM" (sets target to next 3:00 AM), "+5 hodín" (adds 5 hours), custom datetime selector, and clear reset button.
2. Create `QuickLogParser` feature component:
   - Text input labeled "Vložiť chybový výstup z terminálu" with "Analyzovať a pridať" action button.
   - Regular expression parsing function:
     - Matches patterns like `resets 3am`, `resets 3:00 AM`, `try again at Sep 30, 2026, 2:55 AM`, or `try again at 03:00`.
     - Detects agent name in input string (matches "Claude", "Codex", "Continue"); defaults to "Claude Code".
   - Automatically invokes `addRecord()` with `status: "Waiting for Reset"`, detected `agent`, current date for `startedAt`, `mode: "Cloud API"`, and task excerpt.
   - Automatically updates `QuotaCountdown` target time if a time was detected in the parsed log output.
3. Enhance `DataGrid` in `components/patterns/data-grid/index.tsx`:
   - Implement `StatusBadge` renderer:
     - `Active`: Emerald green badge (`bg-emerald-500/15 text-emerald-400 border border-emerald-500/30`)
     - `Paused`: Muted gray badge (`bg-zinc-500/15 text-zinc-400 border border-zinc-500/30`)
     - `Waiting for Reset` / `Waiting for reset`: Amber/Orange badge (`bg-amber-500/15 text-amber-400 border border-amber-500/30`)
     - `Completed`: Blue badge (`bg-blue-500/15 text-blue-400 border border-blue-500/30`)
   - Add filter select controls for `Status` (All, Active, Paused, Waiting for Reset, Completed) and `Agent` (All, Claude Code, OpenAI Codex, Continue) above the table.
   - Apply filter state to filter records displayed in both table and mobile card views.
4. Integrate into `app/[locale]/dashboard/page.tsx`:
   - Mount `QuotaCountdown` at top of dashboard.
   - Mount `QuickLogParser` above `DataGrid`, wiring reset time updates from `QuickLogParser` to `QuotaCountdown`.

## Implementation Steps
1. **Create `components/features/quota-countdown.tsx`**:
   - Implement state `targetTime: Date | null`. Default target time initialized to next 3:00 AM today/tomorrow if initial active state is pending, or configurable.
   - Add interval-based remaining time calculation (`hours`, `minutes`, `seconds`).
   - Render prominent status card with green/amber badge indicator, digital countdown display (`HH:MM:SS`), and preset action buttons ("03:00 AM", "+5 hodín", custom target input button).
2. **Create `components/features/quick-log-parser.tsx`**:
   - Build form with text input (`Input` component) and "Analyzovať a pridať" `Button`.
   - Implement `parseTerminalLog(text: string)` pure utility function.
   - Handle form submit: call `addRecord()`, trigger callback `onResetTimeDetected(targetDate)` if reset time extracted, clear input, and show success message.
3. **Export components in `components/features/index.ts`**:
   - Re-export `QuotaCountdown` and `QuickLogParser`.
4. **Update `components/patterns/data-grid/index.tsx`**:
   - Implement status cell renderer function that checks if `field.key === "status"` and renders color-coded badge.
   - Add `statusFilter` and `agentFilter` state variables.
   - Render dropdown filter controls above records list.
   - Filter `records` by selected `statusFilter` and `agentFilter` before mapping over rows/cards.
5. **Update `app/[locale]/dashboard/page.tsx`**:
   - Add state for `countdownTarget: Date | null` shared between `QuickLogParser` and `QuotaCountdown`.
   - Render `QuotaCountdown` card at top of dashboard container.
   - Render `QuickLogParser` input section above `DataGrid`.

## Risks & Mitigations
- Risk: Terminal error logs may come in various non-standard date formats. → Mitigation: Implement multi-pattern regex matching (12h/24h time, relative reset hours, explicit date strings) with graceful fallback to setting status "Waiting for Reset" without crashing if no time pattern is matched.
- Risk: Firestore schema mismatch when creating records via `QuickLogParser`. → Mitigation: Ensure `addRecord()` provides all required entity fields defined in `prototype.config.json` (`agent`, `status`, `startedAt`, `mode`, `task`).
- Risk: Mobile viewport overflow in filter toolbar. → Mitigation: Use standard responsive flex/grid wrappers (`flex flex-col sm:flex-row gap-3`) ensuring filter dropdowns fit on 360px screens without horizontal scroll.

## Edge Cases
- [ ] Log string contains no date/time format (e.g. "Rate limit exceeded"): Creates record with "Waiting for Reset" status, defaults task text to the raw log, keeps existing countdown unchanged.
- [ ] User sets target countdown time in the past: Automatically transitions status indicator back to Green ("Všetky modely aktívne").
- [ ] Parsed reset time is earlier than current time: Parser sets countdown target to next day's matching time.
- [ ] Filter selection yields 0 results: Displays empty filter state message ("Žiadne záznamy pre vybraný filter" / "No records match selected filter").

## Acceptance Criteria
- [ ] `/dashboard` renders a prominent Live Countdown card at the top displaying active status ("Všetky modely aktívne" in green or "Claude v režime spánku (čaká na reset)" in amber when countdown is active).
- [ ] Clicking preset buttons ("03:00 AM", "+5 hodín") or target time input directly updates the countdown timer target time.
- [ ] Quick log input box accepts terminal error strings (e.g. "resets 3am" or "try again at Sep 30, 2026, 2:55 AM"), parses reset time, and creates a record with status "Waiting for Reset".
- [ ] DataGrid renders status values with color-coded badges (Green for Active, Amber for Waiting for Reset, Muted for Paused, Blue for Completed).
- [ ] DataGrid provides filter dropdowns for Status and Agent that accurately filter rows in both desktop table and mobile card views.

## Out of Scope
- Server-side cron jobs or real-time background push notifications when timer expires.
- Multi-model simultaneous independent countdown cards (single primary agent status card is built for dashboard header).

## Complexity: M — Adds live countdown timer card with interactive time presets, terminal log regex parser with Firestore auto-creation, status badge styling, and table filtering by status/agent.
## Test Strategy: e2e