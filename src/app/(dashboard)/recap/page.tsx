'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatDate } from '@/lib/utils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ProductTipe {
  tipe: 'LM' | 'BR'
}

interface TransactionLineRecap {
  omzet: number
  laba: number
  products: ProductTipe | null
}

interface CustomerInfo {
  nama: string
}

interface TransactionRecap {
  id: string
  nomor_bon: string
  tanggal: string
  status: string
  is_bonus: boolean
  ongkir: number
  customer_id: string
  customers: CustomerInfo | null
  transaction_lines: TransactionLineRecap[]
}

interface BonusGrantRow {
  id: string
  customer_id: string
  transaction_id: string
  jumlah: number
  created_at: string
  customers: { nama: string } | null
  transactions: {
    nomor_bon: string
    tanggal: string
    transaction_lines: {
      quantity: number
      products: { nama: string } | null
    }[]
  } | null
}

interface CustomerOption {
  id: string
  nama: string
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const PAY_PER_PAGE = 20

function monthBounds(month: number, year: number) {
  const d = new Date(year, month - 1, 1)
  return {
    first: format(startOfMonth(d), 'yyyy-MM-dd'),
    last: format(endOfMonth(d), 'yyyy-MM-dd'),
  }
}

function safeTipe(t: string | undefined | null): 'LM' | 'BR' | null {
  if (t === 'LM' || t === 'BR') return t
  return null
}

export default function RecapPage() {
  // Filter state
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterTipe, setFilterTipe] = useState('')
  const [filterBulan, setFilterBulan] = useState('')
  const [filterTahun, setFilterTahun] = useState('')

  // Data state
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [years, setYears] = useState<number[]>([])
  const [transactions, setTransactions] = useState<TransactionRecap[]>([])
  const [bonusLog, setBonusLog] = useState<BonusGrantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [page, setPage] = useState(1)

  // Bonus log filter
  const [bonusFilterYear, setBonusFilterYear] = useState('')
  const [bonusFilterCustomer, setBonusFilterCustomer] = useState('')

  // Load initial data (customers + years)
  useEffect(() => {
    let ignore = false

    async function init() {
      const supabase = createClient()
      const [cRes] = await Promise.all([
        supabase
          .from('customers')
          .select('id, nama')
          .eq('is_deleted', false)
          .order('nama'),
      ])

      if (ignore) return

      if (cRes.data) setCustomers(cRes.data as CustomerOption[])

      const now = new Date().getFullYear()
      setYears(Array.from({ length: 7 }, (_, i) => now - 5 + i))
      setLoading(false)
    }

    init()

    return () => {
      ignore = true
    }
  }, [])

  // Fetch data when filter changes
  useEffect(() => {
    const supabase = createClient()
    let ignore = false

    async function load() {
      setLoadingData(true)

      let query = supabase
        .from('transactions')
        .select(`
          *,
          customers (nama),
          transaction_lines (
            omzet,
            laba,
            products (tipe)
          )
        `)
        .order('tanggal', { ascending: false })

      if (filterCustomer) {
        query = query.eq('customer_id', filterCustomer)
      }

      if (filterBulan && filterTahun) {
        const b = parseInt(filterBulan)
        const y = parseInt(filterTahun)
        const { first, last } = monthBounds(b, y)
        query = query.gte('tanggal', first).lte('tanggal', last)
      } else if (filterTahun) {
        const y = parseInt(filterTahun)
        query = query.gte('tanggal', `${y}-01-01`).lte('tanggal', `${y}-12-31`)
      }

      const [txRes, bonusRes] = await Promise.all([
        query,
        supabase
          .from('bonus_grants')
          .select(`
            *,
            customers (nama),
            transactions (
              nomor_bon,
              tanggal,
              transaction_lines (
                quantity,
                products (nama)
              )
            )
          `)
          .order('created_at', { ascending: false }),
      ])

      if (ignore) return

      if (txRes.data) {
        setTransactions(txRes.data as unknown as TransactionRecap[])
      }

      if (bonusRes.data) {
        setBonusLog(bonusRes.data as unknown as BonusGrantRow[])
      }

      setPage(1)
      setLoadingData(false)
    }

    load()

    return () => {
      ignore = true
    }
  }, [filterCustomer, filterBulan, filterTahun])

  // Apply tipe filter client-side
  const filteredTx = transactions.filter((tx) => {
    if (filterTipe) {
      const hasMatchingLine = tx.transaction_lines.some(
        (l) => safeTipe(l.products?.tipe) === filterTipe
      )
      if (!hasMatchingLine) return false
    }
    return true
  })

  // Non-bonus transactions for main report
  const mainTx = filteredTx.filter((tx) => !tx.is_bonus)

  // Summary calculations
  const lunasTx = mainTx.filter((tx) => tx.status === 'Lunas')
  const piutangTx = mainTx.filter((tx) => tx.status === 'Piutang')

  function txOmzet(lines: TransactionLineRecap[]) {
    return lines.reduce((s, l) => s + (l.omzet ?? 0), 0)
  }

  function txLaba(lines: TransactionLineRecap[]) {
    return lines.reduce((s, l) => s + (l.laba ?? 0), 0)
  }

  function txOmzetByTipe(lines: TransactionLineRecap[], tipe: 'LM' | 'BR') {
    return lines
      .filter((l) => safeTipe(l.products?.tipe) === tipe)
      .reduce((s, l) => s + (l.omzet ?? 0), 0)
  }

  const totalOmzetLunas = lunasTx.reduce((s, tx) => s + txOmzet(tx.transaction_lines), 0)
  const totalLaba = lunasTx.reduce((s, tx) => s + txLaba(tx.transaction_lines), 0)
  const totalPiutang = piutangTx.reduce((s, tx) => {
    return s + txOmzet(tx.transaction_lines) + (tx.ongkir ?? 0)
  }, 0)
  const totalDibayar = lunasTx.reduce((s, tx) => {
    return s + txOmzet(tx.transaction_lines) + (tx.ongkir ?? 0)
  }, 0)

  // Per-customer breakdown (only when filterCustomer = semua)
  const perCustomer = (() => {
    if (filterCustomer) return []
    const map = new Map<string, {
      nama: string
      omzetLM: number
      omzetBR: number
      totalOmzet: number
      laba: number
      piutang: number
    }>()

    for (const tx of lunasTx) {
      const nama = tx.customers?.nama ?? 'Tanpa Nama'
      const cid = tx.customer_id
      if (!map.has(cid)) {
        map.set(cid, { nama, omzetLM: 0, omzetBR: 0, totalOmzet: 0, laba: 0, piutang: 0 })
      }
      const entry = map.get(cid)!
      entry.omzetLM += txOmzetByTipe(tx.transaction_lines, 'LM')
      entry.omzetBR += txOmzetByTipe(tx.transaction_lines, 'BR')
      entry.totalOmzet += txOmzet(tx.transaction_lines)
      entry.laba += txLaba(tx.transaction_lines)
    }

    for (const tx of piutangTx) {
      const cid = tx.customer_id
      const nama = tx.customers?.nama ?? 'Tanpa Nama'
      if (!map.has(cid)) {
        map.set(cid, { nama, omzetLM: 0, omzetBR: 0, totalOmzet: 0, laba: 0, piutang: 0 })
      }
      map.get(cid)!.piutang += txOmzet(tx.transaction_lines) + (tx.ongkir ?? 0)
    }

    return Array.from(map.values()).sort((a, b) => b.totalOmzet - a.totalOmzet)
  })()

  const totalRowCust = perCustomer.reduce(
    (s, r) => ({
      omzetLM: s.omzetLM + r.omzetLM,
      omzetBR: s.omzetBR + r.omzetBR,
      totalOmzet: s.totalOmzet + r.totalOmzet,
      laba: s.laba + r.laba,
      piutang: s.piutang + r.piutang,
    }),
    { omzetLM: 0, omzetBR: 0, totalOmzet: 0, laba: 0, piutang: 0 }
  )

  // Per-month breakdown
  const perMonth = (() => {
    const map = new Map<string, {
      month: number
      year: number
      omzetLM: number
      omzetBR: number
      totalOmzet: number
      laba: number
      piutang: number
    }>()

    for (const tx of lunasTx) {
      const d = new Date(tx.tanggal)
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`
      if (!map.has(key)) {
        map.set(key, { month: d.getMonth() + 1, year: d.getFullYear(), omzetLM: 0, omzetBR: 0, totalOmzet: 0, laba: 0, piutang: 0 })
      }
      const entry = map.get(key)!
      entry.omzetLM += txOmzetByTipe(tx.transaction_lines, 'LM')
      entry.omzetBR += txOmzetByTipe(tx.transaction_lines, 'BR')
      entry.totalOmzet += txOmzet(tx.transaction_lines)
      entry.laba += txLaba(tx.transaction_lines)
    }

    for (const tx of piutangTx) {
      const d = new Date(tx.tanggal)
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`
      if (!map.has(key)) {
        map.set(key, { month: d.getMonth() + 1, year: d.getFullYear(), omzetLM: 0, omzetBR: 0, totalOmzet: 0, laba: 0, piutang: 0 })
      }
      map.get(key)!.piutang += txOmzet(tx.transaction_lines) + (tx.ongkir ?? 0)
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.month - a.month
    })
  })()

  const totalRowMonth = perMonth.reduce(
    (s, r) => ({
      omzetLM: s.omzetLM + r.omzetLM,
      omzetBR: s.omzetBR + r.omzetBR,
      totalOmzet: s.totalOmzet + r.totalOmzet,
      laba: s.laba + r.laba,
      piutang: s.piutang + r.piutang,
    }),
    { omzetLM: 0, omzetBR: 0, totalOmzet: 0, laba: 0, piutang: 0 }
  )

  // Pagination
  const totalPages = Math.max(1, Math.ceil(mainTx.length / PAY_PER_PAGE))
  const pagedTx = mainTx.slice((page - 1) * PAY_PER_PAGE, page * PAY_PER_PAGE)

  // Bonus log filter
  const filteredBonus = bonusLog.filter((b) => {
    if (bonusFilterCustomer && b.customer_id !== bonusFilterCustomer) return false
    if (bonusFilterYear) {
      const y = new Date(b.created_at).getFullYear()
      if (y !== parseInt(bonusFilterYear)) return false
    }
    return true
  })

  // Export PDF
  function exportPDF() {
    const doc = new jsPDF()
    const margin = 14

    doc.setFontSize(16)
    doc.text('Laporan HL', margin, 22)

    doc.setFontSize(10)
    const filterDesc = [
      filterCustomer ? `Customer: ${customers.find((c) => c.id === filterCustomer)?.nama ?? ''}` : 'Customer: Semua',
      filterBulan ? `Bulan: ${MONTHS[parseInt(filterBulan) - 1]}` : 'Bulan: Semua',
      filterTahun ? `Tahun: ${filterTahun}` : 'Tahun: Semua',
      filterTipe ? `Tipe: ${filterTipe}` : 'Tipe: Semua',
    ].join(' | ')
    doc.text(filterDesc, margin, 30)
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, 36)

    doc.setFontSize(11)
    doc.text('Ringkasan', margin, 44)

    autoTable(doc, {
      startY: 48,
      head: [['Item', 'Nilai']],
      body: [
        ['Total Omzet (Lunas)', formatRupiah(totalOmzetLunas)],
        ['Total Laba (Lunas)', formatRupiah(totalLaba)],
        ['Total Piutang Outstanding', formatRupiah(totalPiutang)],
        ['Total Sudah Dibayar', formatRupiah(totalDibayar)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      margin: { left: margin, right: margin },
    })

    let lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

    // Per-customer breakdown
    if (!filterCustomer && perCustomer.length > 0) {
      doc.setFontSize(11)
      doc.text('Breakdown per Customer', margin, lastY)

      autoTable(doc, {
        startY: lastY + 4,
        head: [['Customer', 'Omzet LM', 'Omzet BR', 'Total Omzet', 'Laba', 'Piutang']],
        body: [
          ...perCustomer.map((r) => [
            r.nama,
            formatRupiah(r.omzetLM),
            formatRupiah(r.omzetBR),
            formatRupiah(r.totalOmzet),
            formatRupiah(r.laba),
            formatRupiah(r.piutang),
          ]),
          ['TOTAL', formatRupiah(totalRowCust.omzetLM), formatRupiah(totalRowCust.omzetBR), formatRupiah(totalRowCust.totalOmzet), formatRupiah(totalRowCust.laba), formatRupiah(totalRowCust.piutang)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] },
        footStyles: { fillColor: [232, 232, 232], textColor: [0, 0, 0] },
        margin: { left: margin, right: margin },
      })

      lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
    }

    // Per-month breakdown
    doc.setFontSize(11)
    doc.text('Breakdown per Bulan', margin, lastY)

    autoTable(doc, {
      startY: lastY + 4,
      head: [['Bulan', 'Omzet LM', 'Omzet BR', 'Total Omzet', 'Laba', 'Piutang']],
      body: [
        ...perMonth.map((r) => [
          `${MONTHS[r.month - 1]} ${r.year}`,
          formatRupiah(r.omzetLM),
          formatRupiah(r.omzetBR),
          formatRupiah(r.totalOmzet),
          formatRupiah(r.laba),
          formatRupiah(r.piutang),
        ]),
        ['TOTAL', formatRupiah(totalRowMonth.omzetLM), formatRupiah(totalRowMonth.omzetBR), formatRupiah(totalRowMonth.totalOmzet), formatRupiah(totalRowMonth.laba), formatRupiah(totalRowMonth.piutang)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      footStyles: { fillColor: [232, 232, 232], textColor: [0, 0, 0] },
      margin: { left: margin, right: margin },
    })

    lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

    // Detail transactions
    doc.setFontSize(11)
    doc.text('Detail Transaksi', margin, lastY)

    const detailRows = mainTx.map((tx) => {
      const omzetLM = txOmzetByTipe(tx.transaction_lines, 'LM')
      const omzetBR = txOmzetByTipe(tx.transaction_lines, 'BR')
      const total = omzetLM + omzetBR + (tx.ongkir ?? 0)
      return [
        formatDate(tx.tanggal),
        tx.nomor_bon,
        tx.customers?.nama ?? '-',
        tx.status,
        formatRupiah(omzetLM),
        formatRupiah(omzetBR),
        formatRupiah(tx.ongkir ?? 0),
        formatRupiah(total),
      ]
    })

    if (detailRows.length > 0) {
      autoTable(doc, {
        startY: lastY + 4,
        head: [['Tanggal', 'No Bon', 'Customer', 'Status', 'LM', 'BR', 'Ongkir', 'Total']],
        body: detailRows,
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] },
        margin: { left: margin, right: margin },
      })

      lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
    }

    // Bonus log
    if (filteredBonus.length > 0) {
      if (lastY > 240) {
        doc.addPage()
        lastY = 20
      }

      doc.setFontSize(11)
      doc.text('Log Bonus', margin, lastY)

      const bonusRows = filteredBonus.map((b) => {
        const produk = b.transactions?.transaction_lines
          ?.map((l) => l.products?.nama ?? '-')
          .join(', ') ?? '-'
        return [
          b.transactions ? formatDate(b.transactions.tanggal) : '-',
          b.customers?.nama ?? '-',
          b.transactions?.nomor_bon ?? '-',
          String(b.jumlah),
          produk,
        ]
      })

      autoTable(doc, {
        startY: lastY + 4,
        head: [['Tanggal', 'Customer', 'No Bon', 'Jumlah', 'Produk']],
        body: bonusRows,
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] },
        margin: { left: margin, right: margin },
      })
    }

    const monthPart = filterBulan ? MONTHS[parseInt(filterBulan) - 1] : 'Semua'
    const yearPart = filterTahun || 'Semua'
    doc.save(`HL-Recap-${monthPart}-${yearPart}.pdf`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-text-muted text-[14px] md:text-[15px]">Memuat...</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-[22px] md:text-[28px] font-bold text-text">Laporan</h1>
        <button
          onClick={exportPDF}
          disabled={loadingData}
          className="bg-surface border border-border hover:bg-surface-2 text-text rounded-xl px-6 py-3 text-[15px] font-semibold h-12 transition-colors disabled:opacity-50"
        >
          &#x2B07; Export PDF
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1.5 font-medium">
              Pelanggan
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-[15px] text-text outline-none focus:border-accent transition-colors h-[52px]"
              >
                <option value="">Semua Pelanggan</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.nama}</option>
                ))}
              </select>
              {filterCustomer && (
                <button
                  onClick={() => setFilterCustomer('')}
                  className="shrink-0 w-9 h-9 flex items-center justify-center text-text-muted hover:text-danger hover:bg-surface-2 rounded-xl transition-colors text-lg leading-none"
                >
                  &times;
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1.5 font-medium">
              Tipe
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={filterTipe}
                onChange={(e) => setFilterTipe(e.target.value)}
                className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-[15px] text-text outline-none focus:border-accent transition-colors h-[52px]"
              >
                <option value="">Semua</option>
                <option value="LM">LM</option>
                <option value="BR">BR</option>
              </select>
              {filterTipe && (
                <button
                  onClick={() => setFilterTipe('')}
                  className="shrink-0 w-9 h-9 flex items-center justify-center text-text-muted hover:text-danger hover:bg-surface-2 rounded-xl transition-colors text-lg leading-none"
                >
                  &times;
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1.5 font-medium">
              Bulan
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={filterBulan}
                onChange={(e) => setFilterBulan(e.target.value)}
                className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-[15px] text-text outline-none focus:border-accent transition-colors h-[52px]"
              >
                <option value="">Semua</option>
                {MONTHS.map((name, i) => (
                  <option key={i} value={i + 1}>{name}</option>
                ))}
              </select>
              {filterBulan && (
                <button
                  onClick={() => setFilterBulan('')}
                  className="shrink-0 w-9 h-9 flex items-center justify-center text-text-muted hover:text-danger hover:bg-surface-2 rounded-xl transition-colors text-lg leading-none"
                >
                  &times;
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1.5 font-medium">
              Tahun
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={filterTahun}
                onChange={(e) => setFilterTahun(e.target.value)}
                className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-[15px] text-text outline-none focus:border-accent transition-colors h-[52px]"
              >
                <option value="">Semua</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              {filterTahun && (
                <button
                  onClick={() => setFilterTahun('')}
                  className="shrink-0 w-9 h-9 flex items-center justify-center text-text-muted hover:text-danger hover:bg-surface-2 rounded-xl transition-colors text-lg leading-none"
                >
                  &times;
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-surface rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <p className="text-xs text-text-muted uppercase tracking-wider font-medium">
            Total Omzet
          </p>
          <p className="text-[20px] md:text-[28px] font-mono font-bold text-text mt-2">
            {formatRupiah(totalOmzetLunas)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {lunasTx.length} transaksi
          </p>
        </div>
        <div className="bg-surface rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <p className="text-xs text-text-muted uppercase tracking-wider font-medium">
            Total Laba
          </p>
          <p className="text-[20px] md:text-[28px] font-mono font-bold text-accent mt-2">
            {formatRupiah(totalLaba)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {lunasTx.length} transaksi
          </p>
        </div>
        <div className="bg-surface rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <p className="text-xs text-text-muted uppercase tracking-wider font-medium">
            Piutang Outstanding
          </p>
          <p className="text-[20px] md:text-[28px] font-mono font-bold text-piutang mt-2">
            {formatRupiah(totalPiutang)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {piutangTx.length} transaksi
          </p>
        </div>
        <div className="bg-surface rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <p className="text-xs text-text-muted uppercase tracking-wider font-medium">
            Sudah Dibayar
          </p>
          <p className="text-[20px] md:text-[28px] font-mono font-bold text-lunas mt-2">
            {formatRupiah(totalDibayar)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Termasuk ongkir
          </p>
        </div>
      </div>

      {/* Per-Customer Breakdown */}
      {!filterCustomer && perCustomer.length > 0 && (
        <div className="bg-surface rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-[18px] md:text-[22px] font-semibold text-text">Breakdown per Customer</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="text-left text-[13px] uppercase tracking-wider font-semibold bg-surface-2">
                  <th className="px-6 py-4">Pelanggan</th>
                  <th className="px-4 py-4 text-right">Omzet LM</th>
                  <th className="px-4 py-4 text-right">Omzet BR</th>
                  <th className="px-4 py-4 text-right">Total Omzet</th>
                  <th className="px-4 py-4 text-right">Laba</th>
                  <th className="px-6 py-4 text-right">Piutang</th>
                </tr>
              </thead>
              <tbody className="text-[15px]">
                {perCustomer.map((r, i) => (
                  <tr key={i} className="border-b border-border hover:bg-surface-2/50 transition-colors odd:bg-surface-2/30">
                    <td className="px-6 py-5 text-text font-medium">{r.nama}</td>
                    <td className="px-4 py-5 text-right font-mono text-text">{formatRupiah(r.omzetLM)}</td>
                    <td className="px-4 py-5 text-right font-mono text-text">{formatRupiah(r.omzetBR)}</td>
                    <td className="px-4 py-5 text-right font-mono text-text">{formatRupiah(r.totalOmzet)}</td>
                    <td className="px-4 py-5 text-right font-mono text-accent">{formatRupiah(r.laba)}</td>
                    <td className="px-6 py-5 text-right font-mono text-piutang">{formatRupiah(r.piutang)}</td>
                  </tr>
                ))}
                <tr className="border-b border-border bg-surface-2/50 font-semibold">
                  <td className="px-6 py-5 text-text">TOTAL</td>
                  <td className="px-4 py-5 text-right font-mono text-text">{formatRupiah(totalRowCust.omzetLM)}</td>
                  <td className="px-4 py-5 text-right font-mono text-text">{formatRupiah(totalRowCust.omzetBR)}</td>
                  <td className="px-4 py-5 text-right font-mono text-text">{formatRupiah(totalRowCust.totalOmzet)}</td>
                  <td className="px-4 py-5 text-right font-mono text-accent">{formatRupiah(totalRowCust.laba)}</td>
                  <td className="px-6 py-5 text-right font-mono text-piutang">{formatRupiah(totalRowCust.piutang)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-Month Breakdown */}
      {perMonth.length > 0 && (
        <div className="bg-surface rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-[18px] md:text-[22px] font-semibold text-text">Breakdown per Bulan</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="text-left text-[13px] uppercase tracking-wider font-semibold bg-surface-2">
                  <th className="px-6 py-4">Bulan</th>
                  <th className="px-4 py-4 text-right">Omzet LM</th>
                  <th className="px-4 py-4 text-right">Omzet BR</th>
                  <th className="px-4 py-4 text-right">Total Omzet</th>
                  <th className="px-4 py-4 text-right">Laba</th>
                  <th className="px-6 py-4 text-right">Piutang</th>
                </tr>
              </thead>
              <tbody className="text-[15px]">
                {perMonth.map((r, i) => (
                  <tr key={i} className="border-b border-border hover:bg-surface-2/50 transition-colors odd:bg-surface-2/30">
                    <td className="px-6 py-5 text-text font-medium">{MONTHS[r.month - 1]} {r.year}</td>
                    <td className="px-4 py-5 text-right font-mono text-text">{formatRupiah(r.omzetLM)}</td>
                    <td className="px-4 py-5 text-right font-mono text-text">{formatRupiah(r.omzetBR)}</td>
                    <td className="px-4 py-5 text-right font-mono text-text">{formatRupiah(r.totalOmzet)}</td>
                    <td className="px-4 py-5 text-right font-mono text-accent">{formatRupiah(r.laba)}</td>
                    <td className="px-6 py-5 text-right font-mono text-piutang">{formatRupiah(r.piutang)}</td>
                  </tr>
                ))}
                <tr className="border-b border-border bg-surface-2/50 font-semibold">
                  <td className="px-6 py-5 text-text">TOTAL</td>
                  <td className="px-4 py-5 text-right font-mono text-text">{formatRupiah(totalRowMonth.omzetLM)}</td>
                  <td className="px-4 py-5 text-right font-mono text-text">{formatRupiah(totalRowMonth.omzetBR)}</td>
                  <td className="px-4 py-5 text-right font-mono text-text">{formatRupiah(totalRowMonth.totalOmzet)}</td>
                  <td className="px-4 py-5 text-right font-mono text-accent">{formatRupiah(totalRowMonth.laba)}</td>
                  <td className="px-6 py-5 text-right font-mono text-piutang">{formatRupiah(totalRowMonth.piutang)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Transaksi */}
      <div className="bg-surface rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h2 className="text-[18px] md:text-[22px] font-semibold text-text">Detail Transaksi</h2>
          {loadingData && (
            <span className="text-xs text-text-muted font-mono">Memuat...</span>
          )}
        </div>
        {loadingData && mainTx.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-4">📋</p>
            <p className="text-text-muted text-[15px]">Memuat data...</p>
          </div>
        ) : mainTx.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-4">📋</p>
            <p className="text-text-muted text-[15px]">Belum ada transaksi</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="text-left text-[13px] uppercase tracking-wider font-semibold bg-surface-2">
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-4 py-4">Nomor Bon</th>
                    <th className="px-4 py-4">Pelanggan</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4 text-right">LM</th>
                    <th className="px-4 py-4 text-right">BR</th>
                    <th className="px-4 py-4 text-right">Ongkir</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="text-[15px]">
                  {pagedTx.map((tx) => {
                    const omzetLM = txOmzetByTipe(tx.transaction_lines, 'LM')
                    const omzetBR = txOmzetByTipe(tx.transaction_lines, 'BR')
                    const total = omzetLM + omzetBR + (tx.ongkir ?? 0)

                    let badge: React.ReactNode
                    if (tx.is_bonus) {
                      badge = (
                        <span className="inline-block bg-bonus-bg text-bonus border border-bonus/30 rounded-full px-3.5 py-1.5 text-[13px] font-semibold">
                          BONUS
                        </span>
                      )
                    } else if (tx.status === 'Lunas') {
                      badge = (
                        <span className="inline-block bg-lunas-bg text-lunas border border-lunas/30 rounded-full px-3.5 py-1.5 text-[13px] font-semibold">
                          Lunas
                        </span>
                      )
                    } else {
                      badge = (
                        <span className="inline-block bg-piutang-bg text-piutang border border-piutang/30 rounded-full px-3.5 py-1.5 text-[13px] font-semibold">
                          Piutang
                        </span>
                      )
                    }

                    return (
                      <tr key={tx.id} className="border-b border-border hover:bg-surface-2/50 transition-colors odd:bg-surface-2/30">
                        <td className="px-6 py-5 text-text-secondary whitespace-nowrap">
                          {formatDate(tx.tanggal)}
                        </td>
                        <td className="px-4 py-5 font-mono text-text whitespace-nowrap">
                          <Link
                            href={`/transactions/${tx.id}`}
                            className="hover:text-accent transition-colors"
                          >
                            {tx.nomor_bon}
                          </Link>
                        </td>
                        <td className="px-4 py-5 text-text whitespace-nowrap">
                          {tx.customers?.nama ?? '-'}
                        </td>
                        <td className="px-4 py-5 whitespace-nowrap">{badge}</td>
                        <td className="px-4 py-5 text-right font-mono text-text whitespace-nowrap">
                          {formatRupiah(omzetLM)}
                        </td>
                        <td className="px-4 py-5 text-right font-mono text-text whitespace-nowrap">
                          {formatRupiah(omzetBR)}
                        </td>
                        <td className="px-4 py-5 text-right font-mono text-text whitespace-nowrap">
                          {formatRupiah(tx.ongkir ?? 0)}
                        </td>
                        <td className="px-6 py-5 text-right font-mono text-text font-medium whitespace-nowrap">
                          {formatRupiah(total)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 px-6 py-5 border-t border-border">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="bg-surface border border-border text-text rounded-xl px-5 py-3 text-[15px] font-semibold h-12 hover:bg-surface-2 disabled:opacity-30 transition-colors"
                >
                  &laquo; Sebelumnya
                </button>
                <span className="text-[15px] text-text-secondary font-medium">
                  Halaman {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="bg-surface border border-border text-text rounded-xl px-5 py-3 text-[15px] font-semibold h-12 hover:bg-surface-2 disabled:opacity-30 transition-colors"
                >
                  Selanjutnya &raquo;
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bonus Log */}
      <div className="bg-surface rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h2 className="text-[18px] md:text-[22px] font-semibold text-text">Log Bonus</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              value={bonusFilterCustomer}
              onChange={(e) => setBonusFilterCustomer(e.target.value)}
              className="bg-surface border border-border rounded-xl px-4 py-3 text-[15px] text-text outline-none focus:border-accent transition-colors h-[52px]"
            >
              <option value="">Semua Pelanggan</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.nama}</option>
              ))}
            </select>
            <select
              value={bonusFilterYear}
              onChange={(e) => setBonusFilterYear(e.target.value)}
              className="bg-surface border border-border rounded-xl px-4 py-3 text-[15px] text-text outline-none focus:border-accent transition-colors h-[52px]"
            >
              <option value="">Semua Tahun</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        {filteredBonus.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-4">🎁</p>
            <p className="text-text-muted text-[15px]">Belum ada bonus yang diklaim.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="text-left text-[13px] uppercase tracking-wider font-semibold bg-surface-2">
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-4 py-4">Pelanggan</th>
                  <th className="px-4 py-4">Nomor Bon</th>
                  <th className="px-4 py-4 text-right">Jumlah Bonus</th>
                  <th className="px-6 py-4">Produk</th>
                </tr>
              </thead>
              <tbody className="text-[15px]">
                {filteredBonus.map((b) => {
                  const produk = b.transactions?.transaction_lines
                    ?.map((l) => l.products?.nama ?? '-')
                    .join(', ') ?? '-'

                  return (
                    <tr key={b.id} className="border-b border-border hover:bg-surface-2/50 transition-colors odd:bg-surface-2/30">
                      <td className="px-6 py-5 text-text-secondary whitespace-nowrap">
                        {b.transactions ? formatDate(b.transactions.tanggal) : '-'}
                      </td>
                      <td className="px-4 py-5 text-text whitespace-nowrap">
                        {b.customers?.nama ?? '-'}
                      </td>
                      <td className="px-4 py-5 font-mono text-text whitespace-nowrap">
                        {b.transactions?.nomor_bon ?? '-'}
                      </td>
                      <td className="px-4 py-5 text-right font-mono text-bonus font-medium whitespace-nowrap">
                        {b.jumlah}
                      </td>
                      <td className="px-6 py-5 text-text-secondary text-sm whitespace-nowrap max-w-xs truncate">
                        {produk}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
