# Design System — HL Sales & Receivables App

## Aesthetic Direction

**Tone**: Industrial-Minimal — clean, dense, data-first. Ini adalah internal tool untuk profesional, bukan consumer app. Tidak perlu flashy, tapi harus terasa solid, cepat, dan trustworthy.

**Inspirasi**: Accounting software Jepang + terminal dashboard. Dark mode sebagai default, dengan aksen hijau emerald yang tegas.

**Yang harus diingat**: Setiap halaman harus terasa seperti "buku kas digital" — terorganisir, mudah di-scan, dan tidak ada elemen yang tidak perlu.

---

## Color Palette

```css
/* Base */
--color-bg:           #0f1117;   /* Background utama — sangat gelap */
--color-surface:      #1a1d27;   /* Card, panel, sidebar */
--color-surface-2:    #222535;   /* Input, hover state */
--color-border:       #2e3347;   /* Border halus */

/* Text */
--color-text-primary: #f0f2f8;   /* Teks utama */
--color-text-secondary:#8b90a7;  /* Label, placeholder */
--color-text-muted:   #555b72;   /* Disabled, hint */

/* Accent */
--color-accent:       #10b981;   /* Emerald — CTA, active, success */
--color-accent-dim:   #064e3b;   /* Accent background */

/* Status */
--color-piutang:      #f59e0b;   /* Warning amber — belum bayar */
--color-lunas:        #10b981;   /* Emerald — sudah bayar */
--color-bonus:        #6366f1;   /* Indigo — bonus transaction */

/* Danger */
--color-danger:       #ef4444;   /* Merah — delete, error */
--color-danger-dim:   #450a0a;   /* Danger background */
```

---

## Typography

```
Display / Heading : "DM Mono" (Google Fonts) — monospace, cocok untuk angka keuangan
Body / UI         : "IBM Plex Sans" (Google Fonts) — bersih, readable di ukuran kecil
Angka / Currency  : "DM Mono" selalu — konsistensi untuk semua nilai Rupiah
```

**Skala ukuran:**
| Token | Size | Usage |
|---|---|---|
| `text-xs` | 11px | Label tabel, hint |
| `text-sm` | 13px | Body tabel, input |
| `text-base` | 15px | Body umum |
| `text-lg` | 18px | Section heading |
| `text-xl` | 22px | Page title |
| `text-2xl` | 28px | Dashboard stats |

---

## Layout & Spacing

### Struktur Halaman
```
┌─────────────────────────────────────────┐
│  Sidebar (240px fixed)  │  Main Content  │
│                         │                │
│  - Logo / Brand         │  Page Header   │
│  - Nav Links            │  ─────────     │
│  - User info            │  Content Area  │
│                         │                │
└─────────────────────────────────────────┘
```

### Sidebar Navigation
```
HL                          ← Brand (monospace, accent color)
─────────────────
📊 Dashboard
👥 Customers
📦 Products
🧾 Transactions
📈 Recap
─────────────────
Logout
```

### Spacing Scale (Tailwind)
- Padding card: `p-4` (16px)
- Gap antar section: `gap-6` (24px)
- Padding halaman: `px-6 py-5`

---

## Components

### Button
```
Primary   : bg-accent text-white — untuk aksi utama (Simpan, Buat Bon)
Secondary : bg-surface-2 text-text — untuk aksi sekunder (Batal, Edit)
Danger    : bg-danger-dim text-danger border border-danger — untuk Delete
Ghost     : transparent, hover bg-surface-2 — untuk nav, icon button
```

### Badge / Status
```
Piutang : bg-amber-900/40 text-amber-400 border border-amber-800
Lunas   : bg-emerald-900/40 text-emerald-400 border border-emerald-800
Bonus   : bg-indigo-900/40 text-indigo-400 border border-indigo-800
LM      : bg-blue-900/40 text-blue-400
BR      : bg-purple-900/40 text-purple-400
```

### Table
- Header: `bg-surface-2`, text muted, uppercase, tracking-wide, font-mono
- Row: hover `bg-surface-2/50`, border-bottom `border-border`
- Angka: selalu right-aligned, font-mono
- Actions: icon button di paling kanan

### Card / Panel
```css
background: var(--color-surface);
border: 1px solid var(--color-border);
border-radius: 8px;
padding: 16px;
```

### Input / Form
```css
background: var(--color-surface-2);
border: 1px solid var(--color-border);
border-radius: 6px;
color: var(--color-text-primary);
/* Focus: border-color accent */
```

### Modal
- Overlay: `bg-black/60 backdrop-blur-sm`
- Panel: `bg-surface border border-border rounded-xl`
- Max width: `max-w-md` untuk konfirmasi, `max-w-2xl` untuk form kompleks

---

## Currency Formatting

Semua nilai Rupiah menggunakan format:
```
Rp 1.400.000     ← titik sebagai separator ribuan
Rp 57.600        ← tidak ada desimal untuk IDR
```

Helper function:
```ts
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}
// Output: "Rp 1.400.000"
```

---

## Page-Specific Design Notes

### Dashboard
- 4 stat cards di atas: Total Omzet, Total Laba, Total Piutang, Total Lunas
- Recent transactions table di bawah
- Bonus alerts kalau ada customer yang eligible

### Customer Detail
- Header: nama customer + stats bulan ini
- Month picker (dropdown tahun + bulan)
- 3 tab: Semua | Piutang | Lunas
- Tabel dengan kolom: Tanggal, Nomor Bon, Status, LM, BR, Total, Ongkir, Bayar

### Transaction (Bon) Form
- Layout 2 kolom: info bon (kiri) + line items (kanan)
- Line items: tabel dengan add/remove row
- Auto-calculate semua nilai saat input berubah
- Total summary di footer form

### Recap
- Filter bar: Customer | Tipe | Bulan | Tahun
- Summary cards di atas
- Tabel detail di bawah
- Export PDF button di kanan atas

---

## Responsive

App ini **desktop-first** — internal tool, dipakai di laptop/PC. Tidak perlu fully mobile responsive, tapi minimal harus tidak broken di tablet (768px+).

Breakpoint utama: `lg: 1024px` untuk sidebar collapse.
