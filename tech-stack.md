# Tech Stack — HL Sales & Receivables App

## Overview

Single-user internal web app. Stack dipilih untuk: development cepat, deployment mudah, dan maintenance minimal.

---

## Core Stack

| Layer | Technology | Versi | Alasan |
|---|---|---|---|
| Framework | Next.js (App Router) | 14+ | Full-stack, SSR, file-based routing |
| Language | TypeScript | 5+ | Type safety untuk kalkulasi keuangan |
| Styling | Tailwind CSS | 3+ | Utility-first, cepat, konsisten |
| Database | Supabase (PostgreSQL) | Latest | Auth + DB + API dalam satu platform |
| Deploy | Vercel | Latest | Zero-config deploy untuk Next.js |

---

## Dependencies

### Production

```json
{
  "@supabase/supabase-js": "^2.x",
  "@supabase/ssr": "^0.x",
  "zod": "^3.x",
  "date-fns": "^3.x",
  "jspdf": "^2.x",
  "jspdf-autotable": "^3.x"
}
```

| Package | Fungsi |
|---|---|
| `@supabase/supabase-js` | Supabase client — query database, auth |
| `@supabase/ssr` | Supabase SSR helper untuk Next.js App Router |
| `zod` | Validasi form & schema data |
| `date-fns` | Format tanggal, grouping per bulan |
| `jspdf` | Generate PDF export |
| `jspdf-autotable` | Plugin tabel untuk jsPDF |

### Dev Dependencies

```json
{
  "typescript": "^5.x",
  "eslint": "^8.x",
  "eslint-config-next": "14.x"
}
```

---

## Struktur Folder

```
hl-app/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx        # Halaman login
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # Layout dengan sidebar
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx        # List customers
│   │   │   │   ├── new/page.tsx    # Buat customer baru
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx    # Detail customer
│   │   │   │       └── edit/page.tsx
│   │   │   ├── products/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/edit/page.tsx
│   │   │   ├── transactions/
│   │   │   │   ├── page.tsx        # List semua bon
│   │   │   │   ├── new/page.tsx    # Buat bon baru
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx    # Detail bon
│   │   │   │       └── edit/page.tsx
│   │   │   └── recap/
│   │   │       └── page.tsx        # Laporan
│   │   ├── api/                    # API Routes (kalau dibutuhkan)
│   │   ├── layout.tsx              # Root layout
│   │   └── globals.css             # Global styles + CSS variables
│   ├── components/
│   │   ├── ui/                     # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Table.tsx
│   │   │   └── Card.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── PageHeader.tsx
│   │   ├── customers/
│   │   │   ├── CustomerForm.tsx
│   │   │   └── DiscountStepsEditor.tsx
│   │   ├── transactions/
│   │   │   ├── BonForm.tsx
│   │   │   ├── LineItemsTable.tsx
│   │   │   └── SettleModal.tsx
│   │   └── recap/
│   │       └── RecapTable.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # Browser Supabase client
│   │   │   └── server.ts           # Server Supabase client
│   │   ├── calculations.ts         # Semua logika kalkulasi keuangan
│   │   ├── pdf.ts                  # PDF export helpers
│   │   └── utils.ts                # Format Rupiah, tanggal, dll
│   ├── types/
│   │   └── index.ts                # TypeScript types & interfaces
│   └── middleware.ts               # Auth middleware
├── .env.local                      # Environment variables (tidak di-commit)
├── .env.example                    # Template env (di-commit)
├── design.md                       # Design system docs
├── tech-stack.md                   # File ini
└── README.md                       # Setup & demo credentials
```

---

## Database Schema (Supabase/PostgreSQL)

### Tabel

```
customers
├── id              uuid PK
├── nama            text NOT NULL
├── bonus_threshold bigint DEFAULT 10000000
├── is_deleted      boolean DEFAULT false
└── created_at      timestamptz

discount_steps
├── id              uuid PK
├── customer_id     uuid FK → customers
├── tipe            text ('LM' | 'BR')
├── step_order      int
└── percentage      numeric(5,2)

products
├── id              uuid PK
├── nama            text NOT NULL
├── harga_modal     bigint
├── harga_base      bigint
├── tipe            text ('LM' | 'BR')
├── is_deleted      boolean DEFAULT false
└── created_at      timestamptz

transactions
├── id              uuid PK
├── nomor_bon       text UNIQUE NOT NULL
├── tanggal         date DEFAULT today
├── customer_id     uuid FK → customers
├── ongkir          bigint DEFAULT 0
├── deskripsi       text
├── is_bonus        boolean DEFAULT false
├── status          text ('Piutang' | 'Lunas')
├── payment_date    date
└── created_at      timestamptz

transaction_lines
├── id              uuid PK
├── transaction_id  uuid FK → transactions
├── product_id      uuid FK → products
├── quantity        int
├── harga_base      bigint      ← snapshot saat transaksi dibuat
├── harga_modal     bigint      ← snapshot saat transaksi dibuat
├── discounted_price bigint     ← hasil kalkulasi cascading discount
├── omzet           bigint      ← discounted_price × qty
└── laba            bigint      ← (discounted_price - harga_modal) × qty

bonus_grants
├── id              uuid PK
├── customer_id     uuid FK → customers
├── transaction_id  uuid FK → transactions
├── jumlah          int         ← berapa bonus dikonsumsi dalam 1 bon
└── created_at      timestamptz
```

### Kenapa harga di-snapshot?
Kalau `harga_base` atau `harga_modal` produk diubah di masa depan, transaksi lama tidak boleh berubah nilainya. Makanya nilai disimpan langsung di `transaction_lines`.

---

## Kalkulasi Keuangan (Business Logic)

Semua kalkulasi ada di `src/lib/calculations.ts`:

```ts
// Cascading discount — BUKAN penjumlahan
function cascadingDiscount(base: number, steps: number[]): number {
  return steps.reduce((price, step) => price * (1 - step / 100), base)
}

// Line omzet
function lineOmzet(discountedPrice: number, qty: number): number {
  return discountedPrice * qty
}

// Line laba
function lineLaba(discountedPrice: number, modal: number, qty: number): number {
  return (discountedPrice - modal) * qty
}

// Total piutang (amount owed)
function totalPiutang(omzet: number, ongkir: number): number {
  return omzet + ongkir
}

// Bonus available
function bonusAvailable(
  paidOmzet: number,
  threshold: number,
  alreadyGranted: number
): number {
  return Math.floor(paidOmzet / threshold) - alreadyGranted
}
```

**Aturan cash basis:**
- Omzet, Laba, dan Bonus accumulator **hanya dihitung dari transaksi berstatus Lunas**
- Transaksi Piutang hanya masuk ke kolom "outstanding receivables"

---

## Auth Flow

```
User buka app
    ↓
middleware.ts cek session
    ↓
Belum login? → redirect /login
Sudah login? → lanjut ke halaman tujuan
    ↓
Login page → Supabase Auth (email + password)
    ↓
Berhasil → redirect /dashboard
Gagal → tampilkan error
```

---

## PDF Export

Menggunakan `jsPDF` + `jspdf-autotable`:
- Export list Piutang per customer per bulan
- Export list Transaksi per customer per bulan
- Export Recap keseluruhan

Semua PDF menggunakan format A4, portrait, header dengan nama customer + periode.

---

## Environment Variables

```env
# .env.local (tidak di-commit ke GitHub)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxx
```

---

## Deploy

1. Push ke GitHub (public repo)
2. Import project di Vercel
3. Set environment variables di Vercel dashboard
4. Deploy otomatis setiap push ke `main`

URL format: `https://hl-app-xxxx.vercel.app`
