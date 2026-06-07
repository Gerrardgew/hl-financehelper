'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cascadingDiscount, lineOmzet, lineLaba } from '@/lib/calculations'
import { formatRupiah } from '@/lib/utils'
import {
  getCustomerPaidOmzet,
  getCustomerBonusGranted,
  calculateBonusAvailable,
} from '@/lib/bonus'

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

interface BonusInfo {
  customerNama: string
  paidOmzet: number
  granted: number
  available: number
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
  defaultCustomerId?: string
  defaultIsBonus?: boolean
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

export default function BonForm({
  initialData,
  defaultCustomerId,
  defaultIsBonus,
}: BonFormProps) {
  const router = useRouter()
  const isEdit = !!initialData

  const [tanggal, setTanggal] = useState(initialData?.tanggal ?? todayStr())
  const [nomorBon, setNomorBon] = useState(initialData?.nomor_bon ?? '')
  const [customerId, setCustomerId] = useState(
    initialData?.customer_id ?? defaultCustomerId ?? ''
  )
  const [deskripsi, setDeskripsi] = useState(initialData?.deskripsi ?? '')
  const [ongkir, setOngkir] = useState(
    initialData?.ongkir != null ? String(initialData.ongkir) : '0'
  )
  const [isBonus, setIsBonus] = useState(
    initialData?.is_bonus ?? defaultIsBonus ?? false
  )
  const [lines, setLines] = useState<LineItemData[]>(
    initialData?.lines.map((l, i) => ({
      ...l,
      nama: `Item ${i + 1}`,
    })) ?? []
  )
  const [bonusInfo, setBonusInfo] = useState<BonusInfo | null>(null)
  const [bonusClaimAmount, setBonusClaimAmount] = useState(1)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirming, setConfirming] = useState(false)
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

  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const nomorBonRef = useRef<HTMLInputElement>(null)
  const customerRef = useRef<HTMLSelectElement>(null)
  const firstErrorLineRef = useRef<number | null>(null)

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

  // Load bonus info when in bonus mode
  useEffect(() => {
    if (!isBonus || !customerId) return

    let ignore = false

    async function load() {
      const supabase = createClient()

      const { data: cust } = await supabase
        .from('customers')
        .select('nama, bonus_threshold')
        .eq('id', customerId)
        .single()

      if (ignore || !cust) return

      const paidOmzet = await getCustomerPaidOmzet(customerId)
      const granted = await getCustomerBonusGranted(customerId)
      const available = calculateBonusAvailable(
        paidOmzet,
        cust.bonus_threshold,
        granted
      )

      if (!ignore) {
        setBonusInfo({
          customerNama: cust.nama,
          paidOmzet,
          granted,
          available,
        })
        if (available < 1) {
          // bonus info display already shows available = 0
        }
      }
    }

    load()

    return () => {
      ignore = true
    }
  }, [customerId, isBonus])

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
      setValidationErrors(['Pilih customer dulu sebelum menambah produk.'])
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
    setValidationErrors([])
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

  function handleSubmitClick() {
    setValidationErrors([])
    setFieldErrors({})
    const errors: string[] = []
    const fields: Record<string, boolean> = {}
    let firstLine: number | null = null

    if (!nomorBon.trim()) {
      errors.push('Nomor Bon harus diisi')
      fields.nomorBon = true
    }

    if (!customerId) {
      errors.push('Customer harus dipilih')
      fields.customer = true
    }

    if (lines.length === 0) {
      errors.push('Minimal harus ada 1 produk')
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line.product_id) {
        errors.push(`Produk di baris ke-${i + 1} belum dipilih`)
        fields[`line_${i}_product`] = true
        if (firstLine === null) firstLine = i
      }
      if (line.qty < 1) {
        errors.push(`Qty di baris ke-${i + 1} harus lebih dari 0`)
        fields[`line_${i}_qty`] = true
        if (firstLine === null) firstLine = i
      }
    }

    if (isBonus) {
      if (!bonusInfo) {
        errors.push('Informasi bonus belum dimuat, tunggu sebentar')
      } else {
        if (bonusClaimAmount < 1) {
          errors.push('Jumlah bonus minimal 1')
        }
        if (bonusClaimAmount > bonusInfo.available) {
          errors.push(`Jumlah bonus melebihi yang tersedia (max ${bonusInfo.available})`)
        }
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors)
      setFieldErrors(fields)
      firstErrorLineRef.current = firstLine
      return
    }

    setFieldErrors({})
    setValidationErrors([])

    if (isBonus) {
      setShowConfirm(true)
    } else {
      performSubmit()
    }
  }

  async function performSubmit() {
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
          setValidationErrors([
            `Nomor Bon "${nomorBon.trim()}" sudah dipakai, gunakan nomor lain.`,
          ])
          setSaving(false)
          return
        }
      }

      let txId: string
      const txStatus = isBonus ? 'Lunas' : 'Piutang'

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
            status: txStatus,
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

      if (isBonus && bonusInfo) {
        const { error: be } = await supabase.from('bonus_grants').insert({
          customer_id: customerId,
          transaction_id: txId,
          jumlah: bonusClaimAmount,
        })
        if (be) throw be
      }

      setSaved(true)
      setShowConfirm(false)

      const redirectUrl = isBonus
        ? `/customers/${customerId}`
        : '/transactions'
      setTimeout(() => router.push(redirectUrl), 800)
    } catch (err: unknown) {
      setValidationErrors([
        err instanceof Error ? err.message : 'Gagal menyimpan transaksi.',
      ])
    } finally {
      setSaving(false)
      setConfirming(false)
    }
  }

  async function handleConfirm() {
    setConfirming(true)
    await performSubmit()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {saved && (
        <div className="bg-accent/10 border border-accent/30 rounded-xl px-5 py-4 text-[15px] text-accent font-semibold text-center">
          {isBonus
            ? `Bon Bonus berhasil disimpan! ${bonusClaimAmount} bonus telah diklaim.`
            : 'Transaksi berhasil disimpan \u2713'}
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50" onClick={() => { setValidationErrors([]); setFieldErrors({}) }}>
          <div className="bg-surface border border-border rounded-t-2xl md:rounded-2xl p-6 md:p-8 w-full md:max-w-md mx-0 md:mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-text-muted rounded-full mx-auto mb-4 md:hidden" />
            <div className="flex items-center gap-3">
              <span className="text-4xl">&#x26A0;&#xFE0F;</span>
              <h3 className="text-[22px] font-bold text-text">Form Belum Lengkap</h3>
            </div>
            <ul className="space-y-2">
              {validationErrors.map((msg, i) => (
                <li key={i} className="text-[15px] text-text-secondary flex items-start gap-2">
                  <span className="text-danger shrink-0 mt-0.5">&bull;</span>
                  {msg}
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                setValidationErrors([])
                setFieldErrors({})
                if (fieldErrors.nomorBon && nomorBonRef.current) {
                  nomorBonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  nomorBonRef.current.focus()
                } else if (fieldErrors.customer && customerRef.current) {
                  customerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  customerRef.current.focus()
                } else if (firstErrorLineRef.current !== null) {
                  const el = document.getElementById(`line-product-${firstErrorLineRef.current}`)
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
              }}
              className="bg-accent hover:bg-[#256F28] text-white font-semibold rounded-xl py-3 text-[15px] w-full transition-colors"
            >
              OK, Saya Perbaiki
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)] space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <div>
            <label
              htmlFor="tanggal"
              className="block text-[15px] font-semibold text-text mb-2"
            >
              Tanggal
            </label>
            <input
              id="tanggal"
              type="date"
              required
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3.5 text-[16px] text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors h-[52px]"
            />
          </div>
          <div>
            <label
              htmlFor="nomorBon"
              className="block text-[15px] font-semibold text-text mb-2"
            >
              Nomor Bon
            </label>
            <input
              ref={nomorBonRef}
              id="nomorBon"
              type="text"
              required
              value={nomorBon}
              onChange={(e) => { setNomorBon(e.target.value); setFieldErrors((prev) => ({ ...prev, nomorBon: false })) }}
              className={`w-full bg-surface-2 border rounded-xl px-4 py-3.5 text-[16px] text-text font-mono placeholder-text-muted outline-none focus:ring-2 transition-colors h-[52px] ${
                fieldErrors.nomorBon ? 'border-red-500 focus:border-red-400 focus:ring-red-500/20' : 'border-border focus:border-accent focus:ring-accent/20'
              }`}
              placeholder="Contoh: BON-001"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="customer"
            className="block text-[15px] font-semibold text-text mb-2"
          >
            Pelanggan
          </label>
          <select
            ref={customerRef}
            id="customer"
            required
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value)
              setFieldErrors((prev) => ({ ...prev, customer: false }))

            }}
            className={`w-full bg-surface-2 border rounded-xl px-4 py-3.5 text-[16px] text-text outline-none focus:ring-2 transition-colors h-[52px] ${
              fieldErrors.customer ? 'border-red-500 focus:border-red-400 focus:ring-red-500/20' : 'border-border focus:border-accent focus:ring-accent/20'
            }`}
          >
            <option value="">Pilih pelanggan...</option>
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
            className="block text-[15px] font-semibold text-text mb-2"
          >
            Deskripsi (opsional)
          </label>
          <textarea
            id="deskripsi"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            rows={2}
            className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3.5 text-[16px] text-text placeholder-text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors resize-none min-h-[100px]"
            placeholder="Catatan tambahan..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <div>
            <label
              htmlFor="ongkir"
              className="block text-[15px] font-semibold text-text mb-2"
            >
              Ongkir
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
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3.5 text-[16px] text-text font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors h-[52px]"
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
                className="accent-accent w-5 h-5"
              />
              <span className="text-[15px] text-text">
                Ini adalah Bon Bonus
              </span>
            </label>
          </div>
        </div>
      </div>

      {isBonus && bonusInfo && (
        <div className="bg-bonus-bg border border-bonus/30 rounded-xl px-5 py-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">&#x1F389;</span>
            <p className="text-sm text-bonus font-medium">
              Bon ini adalah bonus untuk <strong>{bonusInfo.customerNama}</strong>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-surface-2 rounded-xl px-4 py-3 text-[15px]">
              <p className="text-text-muted text-xs">Akumulasi Omzet</p>
              <p className="font-mono text-text font-medium mt-0.5">
                {formatRupiah(bonusInfo.paidOmzet)}
              </p>
            </div>
            <div className="bg-surface-2 rounded-xl px-4 py-3 text-[15px]">
              <p className="text-text-muted text-xs">Bonus tersedia</p>
              <p className="font-mono text-bonus font-medium mt-0.5">
                {bonusInfo.available}
              </p>
            </div>
            <div className="bg-surface-2 rounded-xl px-4 py-3 text-[15px]">
              <p className="text-text-muted text-xs">Sudah Diklaim</p>
              <p className="font-mono text-text font-medium mt-0.5">
                {bonusInfo.granted}
              </p>
            </div>
          </div>

          {bonusInfo.available > 0 ? (
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
              <label className="text-sm text-text-secondary shrink-0">
                Jumlah bonus yang diklaim:
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={bonusClaimAmount || ''}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '')
                  setBonusClaimAmount(v === '' ? 0 : parseInt(v))
                }}
                onBlur={() => {
                  if (bonusClaimAmount < 1) setBonusClaimAmount(1)
                  if (bonusClaimAmount > bonusInfo.available)
                    setBonusClaimAmount(bonusInfo.available)
                }}
                className="w-20 bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-[15px] text-text font-mono text-center outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
              />
              <span className="text-xs text-text-muted">
                (max {bonusInfo.available})
              </span>
            </div>
          ) : (
            <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-sm text-danger">
              {bonusInfo.customerNama} tidak memiliki bonus yang tersedia saat ini.
            </div>
          )}
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-text">Item Produk</h2>
          <button
            type="button"
            onClick={addLine}
            className="bg-surface-2 hover:bg-border text-text font-semibold rounded-xl px-5 py-3 text-[15px] w-full md:w-auto transition-colors"
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
          <div className="overflow-x-auto touch-scroll">
            <p className="text-[13px] text-text-secondary text-center md:hidden mb-1 animate-pulse">← Geser untuk detail lengkap →</p>
            <table className="w-full">
              <thead>
                <tr className="text-[13px] uppercase tracking-wider font-semibold text-text-secondary bg-surface-2">
                  <th className="pb-3 pr-3 font-medium">Produk</th>
                  <th className="pb-3 pr-3 font-medium">Tipe</th>
                  <th className="pb-3 pr-3 text-right font-medium">Qty</th>
                  <th className="pb-3 pr-3 text-right font-medium">Harga</th>
                  <th className="pb-3 pr-3 text-right font-medium">Diskon</th>
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
                    <tr key={i} className="border-b border-border align-top">
                      <td className="py-3 pr-3">
                        <select
                          id={`line-product-${i}`}
                          value={line.product_id}
                          onChange={(e) => {
                            updateLineProduct(i, e.target.value)
                            setFieldErrors((prev) => ({ ...prev, [`line_${i}_product`]: false }))
                          }}
                          className={`w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-[15px] text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors ${
                            fieldErrors[`line_${i}_product`] ? 'border-red-500 focus:border-red-400' : 'border-border focus:border-accent'
                          }`}
                        >
                          <option value="">Pilih produk</option>
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
                          onChange={(e) => {
                            updateLineQty(i, e.target.value)
                            setFieldErrors((prev) => ({ ...prev, [`line_${i}_qty`]: false }))
                          }}
                          onBlur={() => handleQtyBlur(i)}
                          className={`w-16 bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-[15px] text-text font-mono text-right outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors ${
                            fieldErrors[`line_${i}_qty`] ? 'border-red-500 focus:border-red-400' : 'border-border focus:border-accent'
                          }`}
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
                          className="text-danger hover:bg-danger-bg font-medium rounded-lg px-3 py-1.5 text-[13px] transition-colors"
                        >
                          Hapus
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

      <div className="bg-surface-2 rounded-xl p-5 space-y-2">
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

      <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-2">
        <button
          type="button"
          onClick={handleSubmitClick}
          disabled={saving || saved}
          className="bg-accent hover:bg-[#256F28] text-white font-semibold rounded-xl px-8 py-3 text-[15px] h-[48px] w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving
            ? 'Menyimpan...'
            : saved
              ? 'Tersimpan \u2713'
              : isEdit
                ? 'Simpan Perubahan'
                : isBonus
                  ? 'Buat Bon Bonus'
                  : 'Buat Bon'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/transactions')}
          className="bg-surface-2 hover:bg-border text-text font-semibold rounded-xl px-6 py-3 text-[15px] h-[48px] w-full md:w-auto transition-colors"
        >
          ← Kembali
        </button>
      </div>

      {showConfirm && bonusInfo && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-t-2xl md:rounded-2xl p-6 md:p-8 w-full md:max-w-md mx-0 md:mx-4 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 bg-text-muted rounded-full mx-auto mb-4 md:hidden" />
            <h3 className="text-[22px] font-bold text-text">
              Konfirmasi Pemberian Bonus
            </h3>
            <p className="text-[15px] text-text-secondary">
              Yakin ingin memberikan {bonusClaimAmount} bonus untuk{' '}
              <strong className="text-text">{bonusInfo.customerNama}</strong>?
            </p>
            {bonusClaimAmount > 1 && (
              <p className="text-sm text-text-muted">
                {bonusClaimAmount} bonus akan dicatat sekaligus dalam 1 transaksi.
              </p>
            )}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false)
                  setConfirming(false)
                }}
                disabled={confirming}
                className="flex-1 bg-surface-2 hover:bg-border text-text font-semibold rounded-xl py-3 text-[15px] h-[52px] disabled:opacity-50 transition-colors"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming}
                className="flex-1 bg-accent hover:bg-[#256F28] text-white font-semibold rounded-xl py-3 text-[15px] h-[52px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {confirming ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
