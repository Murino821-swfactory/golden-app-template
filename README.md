# Golden App Template

A production-ready Next.js starter template with all golden stack patterns.

## Features

- **Next.js 16** with App Router and static export
- **TypeScript** strict mode
- **Tailwind CSS 4** with design tokens
- **shadcn/ui** components
- **Firebase** Authentication (Google Sign-In) and Firestore
- **next-intl** for internationalization
- **Playwright** E2E tests
- **GitHub Actions** CI

## Quick Start

1. Clone from template
2. Copy `.env.local.example` to `.env.local` and fill in Firebase config
3. `npm install`
4. `npm run dev`

## Demo Mode

Set `NEXT_PUBLIC_DEMO_SLUG=your-slug` to namespace Firestore paths under
`demos/your-slug/...`. Used by SW Factory prototype pipeline.

## Testing

```bash
npm run test:e2e     # Playwright smoke suite (see tests/smoke.spec.ts)
```

Two smoke tests are forward-looking gates and are expected to fail until later
work lands: `login page accessible` (no `/login` route yet) and
`playground params apply` (no landing page sections yet). See `CLAUDE.md` →
"Known gaps" for details.

## License

MIT
