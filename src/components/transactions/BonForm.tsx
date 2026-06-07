'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cascadingDiscount, lineOmzet, lineLaba } from '@/lib/calculations'
import { formatRupiah } from '@/lib/utils'

interface LineItemData {
  product_id: string
  nama: string
  tipe: 'LM' | 'BR'
  harga_base: number
  harga_modal: number
  qty: number
  discounted_price: number
  omzet: number
  laba: number
}

interface DiscountStepRow {
  tipe: 'LM' | 'BR'
  step_order: number
  percentage: number
}

interface BonFormProps {
  initialData?: {
    id: string
    tanggal: string
    nomor_bon: string
    customer_id: string
    deskripsi: string | null
    ongkir: number
    is_bonus: boolean
    status: string
    lines: Omit<LineItemData, 'nama'>[]
  }
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function formatDiscountSteps(
  tipe: 'LM' | 'BR',
  steps: DiscountStepRow[]
): string {
  const filtered = steps
    .filter((s) => s.tipe === tipe)
    .sort((a, b) => a.step_order - b.step_order)
  if (filtered.length === 0) return 'Tidak ada diskon'
  const pct = filtered.map((s) => `${s.percentage}%`).join(' \u2192 ')
  const eff = Math.round(
    (1 -
      cascadingDiscount(
        100,
        filtered.map((s) => s.percentage)
      ) /
        100) *
      100
  )
  return `${pct} (efektif ${eff}%)`
}

export default function BonForm({ initialData }: BonFormProps) {
  const router = useRouter()
  const isEdit = !!initialData

  const [tanggal, setTanggal] = useState(initialData?.tanggal ?? todayStr())
  const [nomorBon, setNomorBon] = useState(initialData?.nomor_bon ?? '')
  const [customerId, setCustomerId] = useState(
    initialData?.customer_id ?? ''
  )
  const [deskripsi, setDeskripsi] = useState(initialData?.deskripsi ?? '')
  const [ongkir, setOngkir] = useState(
    initialData?.ongkir != null ? String(initialData.ongkir) : '0'
  )
  const [isBonus, setIsBonus] = useState(initialData?.is_bonus ?? false)
  const [lines, setLines] = useState<LineItemData[]>(
    initialData?.lines.map((l, i) => ({
      ...l,
      nama: `Item ${i + 1}`,
    })) ?? []
  )
  const [customers, setCustomers] = useState<
    { id: string; nama: string }[]
  >([])
  const [products, setProducts] = useState<
    {
      id: string
      nama: string
      tipe: 'LM' | 'BR'
      harga_modal: number
      harga_base: number
    }[]
  >([])
  const [discountSteps, setDiscountSteps] = useState<DiscountStepRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const numOngkir = parseInt(ongkir) || 0

  // Load customers & products
  useEffect(() => {
    let ignore = false
    const supabase = createClient()

    Promise.all([
      supabase
        .from('customers')
        .select('id, nama')
        .eq('is_deleted', false)
        .order('nama'),
      supabase
        .from('products')
        .select('id, nama, tipe, harga_modal, harga_base')
        .eq('is_deleted', false)
        .order('nama'),
    ]).then(([cRes, pRes]) => {
      if (!ignore) {
        if (cRes.data) setCustomers(cRes.data)

        if (pRes.data) {
          const prods = pRes.data
          setProducts(prods)

          // Bug 3 fix: correct line tipe/nama from products data during edit
          if (isEdit) {
            setLines((prev) =>
              prev.map((line) => {
                if (!line.product_id) return line
                const product = prods.find(
                  (p) => p.id === line.product_id
                )
                if (!product) return line
                if (
                  line.tipe === product.tipe &&
                  line.nama === product.nama
                )
                  return line
                return { ...line, tipe: product.tipe, nama: product.nama }
              })
            )
          }
        }
      }
    })

    return () => {
      ignore = true
    }
  }, [isEdit])

  // Load discount steps when customer changes
  useEffect(() => {
    if (!customerId) return

    let ignore = false
    const supabase = createClient()

    supabase
      .from('discount_steps')
      .select('tipe, step_order, percentage')
      .eq('customer_id', customerId)
      .order('step_order')
      .then(({ data }) => {
        if (!ignore) {
          setDiscountSteps((data ?? []) as DiscountStepRow[])
        }
      })

    return () => {
      ignore = true
    }
  }, [customerId])

  // Recalculate lines when discount steps or isBonus changes
  useEffect(() => {
    triggerRecalculate(discountSteps, isBonus)
  }, [discountSteps, isBonus])

  function triggerRecalculate(steps: DiscountStepRow[], bonus: boolean) {
    setLines((prev) =>
      prev.map((line) => {
        if (!line.product_id) return line
        const s = steps
          .filter((st) => st.tipe === line.tipe)
          .sort((a, b) => a.step_order - b.step_order)
          .map((st) => st.percentage)
        const dp = bonus ? 0 : cascadingDiscount(line.harga_base, s)
        const omz = lineOmzet(dp, line.qty)
        const lb = bonus ? 0 : lineLaba(dp, line.harga_modal, line.qty)
        return { ...line, discounted_price: dp, omzet: omz, laba: lb }
      })
    )
  }

  function getStepsForTipe(tipe: 'LM' | 'BR'): number[] {
    return discountSteps
      .filter((s) => s.tipe === tipe)
      .sort((a, b) => a.step_order - b.step_order)
      .map((s) => s.percentage)
  }

  function addLine() {
    if (!customerId) {
      setError('Pilih customer dulu sebelum menambah produk.')
      return
    }
    setLines((prev) => [
      ...prev,
      {
        product_id: '',
        nama: '',
        tipe: 'LM',
        harga_base: 0,
        harga_modal: 0,
        qty: 1,
        discounted_price: 0,
        omzet: 0,
        laba: 0,
      },
    ])
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  function updateLineProduct(index: number, productId: string) {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    const steps = getStepsForTipe(product.tipe)
    const dp = isBonus ? 0 : cascadingDiscount(product.harga_base, steps)
    const omz = lineOmzet(dp, 1)
    const lb = isBonus ? 0 : lineLaba(dp, product.harga_modal, 1)

    setLines((prev) => {
      const updated = [...prev]
      updated[index] = {
        product_id: product.id,
        nama: product.nama,
        tipe: product.tipe,
        harga_base: product.harga_base,
        harga_modal: product.harga_modal,
        qty: 1,
        discounted_price: dp,
        omzet: omz,
        laba: lb,
      }
      return updated
    })
    setError(null)
  }

  function updateLineQty(index: number, raw: string) {
    setLines((prev) => {
      const line = prev[index]
      const num = raw === '' ? 0 : parseInt(raw) || 0
      const omz = lineOmzet(line.discounted_price, num)
      const lb = isBonus
        ? 0
        : lineLaba(line.discounted_price, line.harga_modal, num)
      const updated = [...prev]
      updated[index] = { ...line, qty: num, omzet: omz, laba: lb }
      return updated
    })
  }

  function handleQtyBlur(index: number) {
    setLines((prev) => {
      const line = prev[index]
      if (line.qty >= 1) return prev
      const updated = [...prev]
      updated[index] = { ...line, qty: 1 }
      return updated
    })
  }

  const totalOmzet = lines.reduce((s, l) => s + l.omzet, 0)
  const totalLaba = lines.reduce((s, l) => s + l.laba, 0)
  const totalTagihan = totalOmzet + numOngkir

  async function handleSubmit() {
    setError(null)

    if (!nomorBon.trim()) {
      setError('Nomor Bon wajib diisi.')
      return
    }
    if (!customerId) {
      setError('Customer wajib dipilih.')
      return
    }
    if (lines.length === 0) {
      setError('Minimal satu produk harus ditambahkan.')
      return
    }
    for (const line of lines) {
      if (!line.product_id) {
        setError('Semua baris produk harus diisi.')
        return
      }
      if (line.qty < 1) {
        setError('Quantity minimal 1 untuk semua baris.')
        return
      }
    }

    setSaving(true)
    const supabase = createClient()

    try {
      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('nomor_bon', nomorBon.trim())
        .maybeSingle()

      if (existing) {
        if (!isEdit || (isEdit && existing.id !== initialData!.id)) {
          setError(
            `Nomor Bon "${nomorBon.trim()}" sudah dipakai, gunakan nomor lain.`
          )
          setSaving(false)
          return
        }
      }

      let txId: string

      if (isEdit) {
        txId = initialData!.id
        const { error: ue } = await supabase
          .from('transactions')
          .update({
            nomor_bon: nomorBon.trim(),
            tanggal,
            customer_id: customerId,
            deskripsi: deskripsi || null,
            ongkir: numOngkir,
            is_bonus: isBonus,
          })
          .eq('id', txId)
        if (ue) throw ue

        await supabase
          .from('transaction_lines')
          .delete()
          .eq('transaction_id', txId)
      } else {
        const { data: inserted, error: ie } = await supabase
          .from('transactions')
          .insert({
            nomor_bon: nomorBon.trim(),
            tanggal,
            customer_id: customerId,
            deskripsi: deskripsi || null,
            ongkir: numOngkir,
            is_bonus: isBonus,
            status: 'Piutang',
          })
          .select('id')
          .single()
        if (ie) throw ie
        txId = inserted.id
      }

      const txLines = lines
        .filter((l) => l.product_id)
        .map((l) => ({
          transaction_id: txId,
          product_id: l.product_id,
          quantity: l.qty,
          harga_base: l.harga_base,
          harga_modal: l.harga_modal,
          discounted_price: l.discounted_price,
          omzet: l.omzet,
          laba: l.laba,
        }))

      if (txLines.length > 0) {
        const { error: le } = await supabase
          .from('transaction_lines')
          .insert(txLines)
        if (le) throw le
      }

      setSaved(true)
      setTimeout(() => router.push('/transactions'), 800)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Gagal menyimpan transaksi.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {saved && (
        <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg px-5 py-3.5 text-sm text-emerald-400 font-medium text-center">
          Transaksi berhasil disimpan ✓
        </div>
      )}

      {error && (
        <div className="bg-red-950/50 border border-red-800 rounded-lg px-5 py-3.5 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl p-5 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="tanggal"
              className="block text-sm font-medium text-text-secondary mb-1.5"
            >
              Tanggal
            </label>
            <input
              id="tanggal"
              type="date"
              required
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-[15px] text-text outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label
              htmlFor="nomorBon"
              className="block text-sm font-medium text-text-secondary mb-1.5"
            >
              Nomor Bon
            </label>
            <input
              id="nomorBon"
              type="text"
              required
              value={nomorBon}
              onChange={(e) => setNomorBon(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-[15px] text-text font-mono placeholder-text-muted outline-none focus:border-accent transition-colors"
              placeholder="Contoh: BON-001"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="customer"
            className="block text-sm font-medium text-text-secondary mb-1.5"
          >
            Customer
          </label>
          <select
            id="customer"
            required
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value)
              setError(null)
            }}
            className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-[15px] text-text outline-none focus:border-accent transition-colors"
          >
            <option value="">Pilih customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="deskripsi"
            className="block text-sm font-medium text-text-secondary mb-1.5"
          >
            Deskripsi (opsional)
          </label>
          <textarea
            id="deskripsi"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            rows={2}
            className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-[15px] text-text placeholder-text-muted outline-none focus:border-accent transition-colors resize-none"
            placeholder="Catatan tambahan..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="ongkir"
              className="block text-sm font-medium text-text-secondary mb-1.5"
            >
              Ongkir / Biaya Kirim
            </label>
            <input
              id="ongkir"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={ongkir}
              onChange={(e) => setOngkir(e.target.value.replace(/\D/g, ''))}
              onBlur={() => {
                if (ongkir === '') setOngkir('0')
              }}
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-[15px] text-text font-mono outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="flex items-end pb-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isBonus}
                onChange={(e) => {
                  const checked = e.target.checked
                  setIsBonus(checked)
                  triggerRecalculate(discountSteps, checked)
                }}
                className="accent-emerald-500 w-5 h-5"
              />
              <span className="text-[15px] text-text">
                Ini adalah Bon Bonus
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium text-text">Item Produk</h2>
          <button
            type="button"
            onClick={addLine}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg px-4 py-2 text-[15px] transition-colors"
          >
            + Tambah Produk
          </button>
        </div>

        {customerId && discountSteps.length > 0 && (
          <div className="mb-4 space-y-1 text-xs text-text-secondary font-mono">
            <p>Diskon LM: {formatDiscountSteps('LM', discountSteps)}</p>
            <p>Diskon BR: {formatDiscountSteps('BR', discountSteps)}</p>
          </div>
        )}

        {lines.length === 0 ? (
          <p className="text-text-muted text-[15px] py-4 text-center">
            Belum ada produk. Klik &quot;+ Tambah Produk&quot; untuk mulai.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-text-muted uppercase tracking-wider font-mono">
                  <th className="pb-3 pr-3 font-medium">Produk</th>
                  <th className="pb-3 pr-3 font-medium">Tipe</th>
                  <th className="pb-3 pr-3 text-right font-medium">Qty</th>
                  <th className="pb-3 pr-3 text-right font-medium">
                    Harga Base
                  </th>
                  <th className="pb-3 pr-3 text-right font-medium">
                    Harga Diskon
                  </th>
                  <th className="pb-3 pr-3 text-right font-medium">Omzet</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="text-[15px]">
                {lines.map((line, i) => {
                  const effPct =
                    line.harga_base > 0
                      ? Math.round(
                          (1 - line.discounted_price / line.harga_base) *
                            100
                        )
                      : 0

                  return (
                    <tr key={i} className="border-t border-border align-top">
                      <td className="py-3 pr-3">
                        <select
                          value={line.product_id}
                          onChange={(e) =>
                            updateLineProduct(i, e.target.value)
                          }
                          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-[15px] text-text outline-none focus:border-accent transition-colors"
                        >
                          <option value="">Pilih produk...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nama} ({p.tipe})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-mono font-medium border ${
                            line.tipe === 'LM'
                              ? 'bg-blue-900/40 text-blue-400 border-blue-800'
                              : 'bg-purple-900/40 text-purple-400 border-purple-800'
                          }`}
                        >
                          {line.tipe}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={line.qty || ''}
                          onChange={(e) =>
                            updateLineQty(i, e.target.value)
                          }
                          onBlur={() => handleQtyBlur(i)}
                          className="w-16 bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-[15px] text-text font-mono text-right outline-none focus:border-accent transition-colors"
                        />
                      </td>
                      <td className="py-3 pr-3 text-right font-mono text-text">
                        {line.harga_base > 0
                          ? formatRupiah(line.harga_base)
                          : '\u2014'}
                      </td>
                      <td className="py-3 pr-3 text-right font-mono text-text">
                        {line.discounted_price > 0 || line.product_id ? (
                          <span>
                            {formatRupiah(line.discounted_price)}
                            {effPct > 0 && (
                              <span className="text-xs text-text-muted ml-1">
                                (-{effPct}%)
                              </span>
                            )}
                          </span>
                        ) : (
                          '\u2014'
                        )}
                      </td>
                      <td className="py-3 pr-3 text-right font-mono text-accent font-medium">
                        {line.omzet > 0 || line.product_id
                          ? formatRupiah(line.omzet)
                          : '\u2014'}
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          className="text-text-muted hover:text-danger text-lg transition-colors px-1"
                        >
                          \u00d7
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-2">
        <div className="flex justify-between text-[15px]">
          <span className="text-text-secondary">Total Omzet</span>
          <span className="font-mono text-text font-medium">
            {formatRupiah(totalOmzet)}
          </span>
        </div>
        <div className="flex justify-between text-[15px]">
          <span className="text-text-secondary">Ongkir</span>
          <span className="font-mono text-text">
            {formatRupiah(numOngkir)}
          </span>
        </div>
        <div className="border-t border-border pt-2 flex justify-between text-[15px]">
          <span className="text-text font-medium">Total Tagihan</span>
          <span className="font-mono text-text font-bold text-lg">
            {formatRupiah(totalTagihan)}
          </span>
        </div>
        <div className="flex justify-between text-[15px]">
          <span className="text-text-secondary">Total Laba</span>
          <span className="font-mono text-accent font-medium">
            {formatRupiah(totalLaba)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || saved}
          className="bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg px-6 py-3 text-[15px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving
            ? 'Menyimpan...'
            : saved
              ? 'Tersimpan \u2713'
              : isEdit
                ? 'Simpan Perubahan'
                : 'Buat Bon'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/transactions')}
          className="text-text-secondary hover:text-text text-[15px] transition-colors"
        >
          \u2190 Kembali
        </button>
      </div>
    </div>
  )
}
