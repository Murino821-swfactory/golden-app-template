## Process Log

### Turn 1: Scope Identification
SCOPE:
- Type: NEW
- Layers: frontend, lib
- Primary files:
  - `lib/cv-analyzer.ts` (NEW: core skill extraction engine, match scoring logic, recommendation generator, sample presets, Markdown export helper)
  - `components/features/cv-matcher.tsx` (NEW: dual input text panels, sample preset buttons, score indicator, matched/missing skill tags, action tips module, report export/print controls)
  - `components/features/index.ts` (MODIFY: re-export `CvMatcher`)
  - `app/dashboard/page.tsx` (MODIFY: integrate `CvMatcher` component into dashboard view)
- Dependencies: `@/components/ui/button`, `@/components/ui/card`, `lucide-react` icons, `@/components/auth/auth-guard`
- Integrations: Client-side Markdown file download (`Blob` + `URL.createObjectURL`), native print stream (`window.print()`)

### Turn 2: Codebase Exploration
CODE UNDERSTANDING:
- Implementation pattern: Next.js App Router client components (`"use client"`), React hooks (`useState`, `useMemo`), Tailwind CSS 4 token-based styling.
- Constraints: Next.js static export (`output: 'export'`), no server-side API routes permitted. All analysis logic runs in the browser. WCAG 2.1 AA accessible touch targets (>= 44px) and dark theme compatibility.
- Conventions: Modular feature exports in `components/features/index.ts`, standard UI components in `components/ui/`, semantic design tokens (`bg-card`, `bg-background`, `border-border`, `text-foreground`).
- Integration points: Embedded within `app/dashboard/page.tsx` inside `AuthGuard`.

### Turn 3: Memory/Knowledge
LESSONS:
- Similar issues: No similar past issues found for CV analyzer in this repository.
- Patterns to reuse: UI layout with shadcn `Card` and `Button` primitives, Lucide icons (`CheckCircle`, `XCircle`, `Download`, `Printer`, `FileText`, `Sparkles`), semantic theme color utility classes.
- Anti-patterns: Avoid hardcoded pixel colors or light-mode assumptions; rely on dark-theme compatible semantic tokens and explicit accessible color contrasts (e.g. `emerald` for high match, `amber` for medium match, `rose`/`red` for low match). Ensure all `window` references occur only inside browser event handlers.

---

## Scope
- Type: NEW
- Layers: frontend, lib
- Files:
  - `lib/cv-analyzer.ts` — Skill taxonomy dictionary, string normalization, CV vs Job Description matching algorithm, percentage score computation, recommendations generator, sample preset data (Frontend, Backend, Product Manager), Markdown summary exporter.
  - `components/features/cv-matcher.tsx` — Dual panel text inputs (CV & Job Description), preset loader buttons, match score meter badge with color indicator, skills breakdown list with green (Match) and red/orange (Missing) visual tags, action recommendation tips card, Markdown export button, print layout trigger.
  - `components/features/index.ts` — Re-export `CvMatcher`.
  - `app/dashboard/page.tsx` — Main interactive dashboard layout rendering `CvMatcher`.
- Dependencies: `components/ui/button.tsx`, `components/ui/card.tsx`, `lucide-react`.

## Approach
Implement a pure client-side CV & Job Description Analyzer in TypeScript:
1. **Extraction Engine (`lib/cv-analyzer.ts`)**:
   - Parses Job Description text for required technical and soft skills, tools, and methodologies using a structured skill taxonomy and keyword extraction algorithms.
   - Normalizes text (lowercasing, punctuation stripping, handling alias variants like `React.js` / `React`, `TypeScript` / `TS`, `Node.js` / `Node`).
   - Checks presence of job requirements within the CV text.
   - Calculates **Match Score %** = `(Matched Requirements / Total Job Requirements) * 100`.
   - Categorizes score into 3 tiers:
     - **High Match (>= 70%)**: Green indicator / badge.
     - **Medium Match (40% - 69%)**: Yellow/Orange indicator / badge.
     - **Low Match (< 40%)**: Red indicator / badge.
   - Segregates skills into **Matched Skills** (`Zhoda`) and **Missing Skills** (`Chýbajúce zručnosti`).
   - Generates structured actionable recommendations based on missing skills, keyword frequency, and rephrasing suggestions for work experience.
   - Provides sample presets (e.g. Frontend Developer, Backend Developer, Product Manager) for 1-click testing.
   - Generates formatted Markdown report string for download.
2. **Interactive UI (`components/features/cv-matcher.tsx`)**:
   - Dual Input layout: Left panel for CV, Right panel for Job Description with word/character counters.
   - Sample loader dropdown/buttons ("Načítať ukážku: Frontend Developer", "Backend", "Product Manager").
   - Live / On-demand analysis trigger button with instant response.
   - Results dashboard: Visual score gauge, color-coded tag list for matched vs missing skills, structured tip cards for CV improvement, Markdown export (`.md` file generation) and Print view (`window.print()`).

## Implementation Steps
1. **Create `lib/cv-analyzer.ts`**:
   - Define data types: `SkillMatch`, `AnalysisResult`, `Recommendation`, `PresetData`.
   - Implement skill taxonomy (programming languages, frameworks, tools, soft skills, methodologies) and alias mapper.
   - Implement `analyzeCv(cvText: string, jobText: string): AnalysisResult`.
   - Implement `generateMarkdownReport(result: AnalysisResult): string`.
   - Implement sample data sets (`FRONTEND_PRESET`, `BACKEND_PRESET`, `PM_PRESET`).

2. **Create `components/features/cv-matcher.tsx`**:
   - Build dual textarea layout (`grid md:grid-cols-2 gap-6`).
   - Implement preset selection handler ("Načítať ukážku").
   - Display Match Score card with visual percentage meter and color-coded status badge.
   - Display two tag lists:
     - Green badges for Matched Skills (`Zhoda`).
     - Orange/Red badges for Missing Skills (`Chýbajúce zručnosti`).
   - Display Action Recommendations module divided into sections:
     - Missing keywords to add.
     - Experience rephrasing & formatting tips.
   - Implement Markdown export button downloading `cv-analysis-report.md`.
   - Implement Print/PDF button calling `window.print()`.

3. **Export in `components/features/index.ts`**:
   - Add `export { CvMatcher } from "./cv-matcher";`.

4. **Update `app/dashboard/page.tsx`**:
   - Import `CvMatcher` and render it as the primary feature in the authenticated dashboard.

## Risks & Mitigations
- **Risk**: Very short or empty input text produces NaN or divide-by-zero score.
  - **Mitigation**: Guard against empty input; display prompt to paste CV and Job Description when fields are blank.
- **Risk**: Keyword extraction false positives/negatives due to word variations or formatting.
  - **Mitigation**: Implement skill alias mapping (e.g. `JS` -> `JavaScript`, `ReactJS` -> `React`) and boundary-aware regex matching.
- **Risk**: Print output includes unnecessary header/navigation UI elements.
  - **Mitigation**: Add `@media print` CSS utility styles to hide chrome navigation and format report cleanly for print/PDF export.

## Edge Cases
- [ ] User clears one or both text fields: UI resets gracefully showing empty/placeholder state without crashing.
- [ ] Job Description contains no identifiable standard skills: Fallback gracefully to word frequency/ngram overlap and display an appropriate notice.
- [ ] Single click sample loader selected while text exists: Replaces inputs with sample data and triggers immediate re-analysis.
- [ ] Large input text (> 10,000 words): Analysis executes performantly on client without blocking UI thread.

## Acceptance Criteria
- [ ] **Dual Input Interface**: CV text area on the left, Job Description text area on the right.
- [ ] **Preset Data Loader**: "Načítať ukážku: Frontend Developer" button (plus additional presets) populates both fields in 1 click.
- [ ] **Match Score Meter**: Percentage match displayed with color indicator (Green >= 70%, Orange/Yellow 40-69%, Red < 40%).
- [ ] **Skills Tag Lists**:
  - Matched skills shown with green visual tags/badges.
  - Missing skills from the job offer shown with orange/red visual tags/badges.
- [ ] **Action Recommendations**: Structured tips detailing what keywords to add, what skills to strengthen, and how to rephrase experience bullet points.
- [ ] **Export & Print**:
  - "Exportovať Markdown" downloads a `.md` summary file.
  - "Tlačiť / Stiahnuť zhrnutie" triggers clean browser print summary.
- [ ] **Dark Mode & Styling**: Fully compliant with project dark theme design tokens and responsive on mobile/desktop.

## Out of Scope
- Backend AI/LLM API calls (all analysis runs client-side for immediate speed, zero API cost, and static export compatibility).
- PDF document parsing/OCR (input is structured text paste).

## Complexity: M
## Test Strategy: e2e