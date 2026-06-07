# HL App — Agent Guide

## Project state

Fully built HL Sales & Receivables app (Next.js 16 App Router). Pages exist for auth (`/login`), dashboard, customers (list/detail/new/edit), products (list/new/edit), transactions (list/detail/new/edit/bonus), and recap with PDF export. Supabase auth + DB queries implemented. See `tech-stack.md` and `design.md` for aspirational design reference — code is current truth.

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
npm run dev     # dev server (http://localhost:3000)
npm run build   # production build
npm run start   # start production server
npm run lint    # ESLint (flat config)
```

No testing framework, CI, or pre-commit hooks configured.

## Environment

Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

## Conventions

- **IDR formatting**: `new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })`.
- **Rupiah values**: NEVER use `truncate` or `text-ellipsis` on Rupiah numbers. Use `break-words` + `leading-tight` to allow wrapping if needed. Always show the full number.
- **Stat card values**: `text-base md:text-lg lg:text-xl xl:text-2xl` (progressive sizing, never truncate).
- **Dark mode**: localStorage key `hl-theme` (`'dark'` or `'light'`), class on `<html>`. Init script in `<head>` to avoid flash.

## Responsive layout

- **Sidebar**: `hidden md:flex` — `w-[200px] lg:w-[260px]`. Always shows full text (icon + label). No icon-only mode.
- **Bottom nav**: `md:hidden` — 5 items, `flex-1`, `min-h-[48px]`, `text-[24px]` icon + `text-[11px]` label.
- **Main content**: `md:ml-[200px] lg:ml-[260px]`, `pb-20 md:pb-0` for bottom nav clearance.
- **Tables on mobile**: Card view (`block md:hidden`) — each row becomes a card with `bg-surface border border-border rounded-xl p-4 mb-3`.
- **Tables on tablet**: `overflow-x-auto` wrapper with gradient scroll hint.
- **Safe area iOS**: `safe-pb` / `safe-pt` classes use `env(safe-area-inset-*)`.

## Supabase auth

Auth is implemented (not planned):
- `src/lib/supabase/client.ts` — browser client (`createBrowserClient`)
- `src/lib/supabase/server.ts` — server client (`createServerClient` with cookie helpers)
- `src/middleware.ts` — session check + redirect to `/login`

## Known lint issues (pre-existing)

- `react-hooks/set-state-in-effect` in `layout.tsx` ThemeToggle (setMounted/setDark inside useEffect)
- `react/no-danger` eslint-disable directive with no reported problems in root `layout.tsx`
