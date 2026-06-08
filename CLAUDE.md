# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Common Development Commands

| Task | Command | Notes |
|------|---------|-------|
| **Start development server** | `npm run dev` | Runs `next dev`; the app will be available at `http://localhost:3000`.
| **Build for production** | `npm run build` | Compiles the Next.js app and produces the `.next` directory.
| **Start production server** | `npm run start` | Serves the built app (use after `npm run build`).
| **Lint** | `npm run lint` | Executes ESLint using the configuration in `eslint.config.mjs`.
| **Run a single script** | `node <script>` | For ad‑hoc scripts placed under `src/lib/` (e.g., `node src/lib/pdf.ts`).
| **Install dependencies** | `npm install` | Installs all `dependencies` and `devDependencies`.

> **Note:** The repository does not currently include a test suite. If you add tests (e.g., with Jest or Playwright), add a corresponding script in `package.json` (e.g., `"test": "jest"`) and document the command here.

---

## High‑Level Architecture

The project is a **single‑user internal web application** built with **Next.js (App Router) + TypeScript** and uses **Supabase** as the backend (authentication, database, and API).

### Folder Overview (relevant to Claude)

- `src/app/` – Next.js **App Router** pages and layout.
  - `(auth)/login/page.tsx` – Login page.
  - `(dashboard)/` – All protected UI under a dashboard layout (`layout.tsx`). Sub‑folders for `customers`, `products`, `transactions`, and `recap` each contain `page.tsx` for list views, `new/page.tsx` for creation, and `[id]/` routes for detail & edit pages.
  - `layout.tsx` (root) – Sets up global providers and the `<html>`/`<body>` structure.
  - `globals.css` – Global Tailwind CSS imports and CSS variables.
- `src/components/` – Reusable UI components.
  - `ui/` – Primitive components (`Button`, `Input`, `Modal`, `Badge`, `Table`, `Card`).
  - `layout/` – Layout primitives (`Sidebar`, `PageHeader`).
  - Domain‑specific components (e.g., `customers/CustomerForm.tsx`, `transactions/BonForm.tsx`).
- `src/lib/` – Business logic and external integrations.
  - `supabase/client.ts` – Browser Supabase client (used by UI).
  - `supabase/server.ts` – Server‑side Supabase client (used in server‑only code, e.g., API routes).
  - `calculations.ts` – Core **financial calculations** (cascading discounts, omzet, laba, total piutang, bonus availability).
  - `pdf.ts` – Helpers for generating PDF reports via `jsPDF` & `jspdf‑autotable`.
  - `utils.ts` – Miscellaneous helpers (Rupiah formatting, date utils, etc.).
- `src/types/` – Central TypeScript type definitions for entities (`Customer`, `Product`, `Transaction`, etc.).
- `src/middleware.ts` – **Auth middleware** that protects the dashboard routes by checking Supabase session; redirects unauthenticated users to `/login`.
- `next.config.ts` – Minimal Next.js configuration (placeholder for future options).
- `tsconfig.json` – TypeScript compiler settings; `paths` alias `@/*` → `./src/*` for clean imports.

### Core Concepts

1. **Supabase Integration** – Two clients are exported:
   - **Client (browser)** for UI interactions, e.g., fetching data via `.from(...).select()`.
   - **Server (Edge/API)** for server‑side data fetching and SSR, leveraged by Next.js server functions.
2. **Financial Calculations** live in `src/lib/calculations.ts` and are pure functions; they are used by both the UI (display) and PDF generation.
3. **Auth Flow** – Implemented in `src/middleware.ts`. Unauthenticated requests are redirected to the login page; successful login stores a Supabase session cookie.
4. **PDF Export** – `src/lib/pdf.ts` builds PDF reports for receivables, transactions, and recap using `jsPDF`.
5. **Tailwind CSS** – UI styling relies on Tailwind utilities; custom design tokens are defined in `globals.css`.

---

## Important Project Files

- **`README.md`** – Contains setup instructions, demo credentials, and a brief overview (the file is present but not needed for Claude’s guidance beyond noting its existence).
- **`design.md`** – Design system documentation (e.g., color palette, typography). Review when adding new UI components.
- **`.env.example`** – Template for required environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- **`tech-stack.md`** – Already provides a concise stack summary; refer to it for version numbers and why each technology was chosen.
- **`eslint.config.mjs`** – ESLint configuration used by the `npm run lint` script.

---

## Suggested Enhancements

- **Testing** – Add a testing framework (e.g., Jest for unit tests, Playwright for end‑to‑end) and a `npm test` script.
- **CI Workflow** – Include a GitHub Actions workflow that runs lint (and tests when added) on each push.
- **Documentation Generation** – Consider generating API docs from the TypeScript types for easier onboarding.

---

## Usage Tips for Claude Code

- When modifying business logic, update the corresponding pure functions in `src/lib/calculations.ts` and adjust any related UI components.
- For UI changes, prefer reusing components from `src/components/ui/` to keep visual consistency.
- Use the `@/*` import alias for concise imports, e.g., `import { calculateTotal } from '@/lib/calculations'`.
- If you need to run the app locally, ensure a `.env.local` file is present (copy from `.env.example`) before running `npm run dev`.
- For any schema changes in Supabase, update the types in `src/types/index.ts` and adjust the client/server code accordingly.

## Performance Optimizations Implemented

- **Bundle analysis**: The project now includes `@next/bundle-analyzer`. Run `ANALYZE=true npm run build` to generate an interactive size report at `/.next/analyze.html`.
- **Tailwind CSS purge**: Added `tailwind.config.cjs` with explicit `content` paths so unused utility classes are removed in production builds.
- **Lazy‑load heavy UI components**: (Removed due to compatibility)
- **Future‑proofing**: The `next.config.ts` file wraps the base config with the analyzer plugin, making it easy to enable/disable via the `ANALYZE` env var.
