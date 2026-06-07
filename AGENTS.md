# HL App — Agent Guide

## State of the project

This is **very early** — only `create-next-app` scaffolding exists. The files `tech-stack.md` and `design.md` are **aspirational design docs** for a planned HL Sales & Receivables app. Do not reference them as current source truth. Features described there (auth, dashboard, customers, products, transactions, recap, PDF export, Supabase helpers) have **zero implementation yet**.

## Framework & toolchain

- **Next.js 16** (App Router) — read `node_modules/next/dist/docs/` before writing code; this version has breaking changes vs. training data.
- **Tailwind CSS v4** — uses `@import "tailwindcss"` (not `@tailwind` directives) and `@theme inline` for theme tokens.
- **TypeScript** — path alias `@/*` → `./src/*` (configured in `tsconfig.json`).
- **ESLint 9** flat config (`eslint.config.mjs`) — core-web-vitals + TypeScript rules.
- **PostCSS** with `@tailwindcss/postcss` plugin (v4).

## Key dependencies

| Package | Purpose |
|---|---|
| `@supabase/ssr` + `@supabase/supabase-js` | Supabase SSR auth + client |
| `zod` | Schema/input validation |
| `date-fns` | Date formatting |
| `jspdf` + `jspdf-autotable` | PDF export |

## Commands

```bash
npm run dev      # dev server (http://localhost:3000)
npm run build    # production build
npm run start    # start production server
npm run lint     # ESLint (flat config)
```

No testing framework, CI, or pre-commit hooks configured.

## Environment

Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

## Conventions

- Numbers: format IDR via `new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })`.
- Dark-first design (see `design.md` palette if implementing UI).
- Desktop-first, tablet-minimum (768px+).

## Supabase SSR auth pattern (planned but not yet implemented)

Based on the `@supabase/ssr` dependency, auth is expected to use:
- `src/lib/supabase/client.ts` — browser client
- `src/lib/supabase/server.ts` — server client (cookies helpers)
- `src/middleware.ts` — session check + redirect
