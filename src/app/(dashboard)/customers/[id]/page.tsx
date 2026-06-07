'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatDate } from '@/lib/utils'
import {
  getCustomerPaidOmzet,
  getCustomerBonusGranted,
  calculateBonusAvailable,
} from '@/lib/bonus'
import BonusAlert from '@/components/bonus/BonusAlert'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface DiscountStepRow {
  id: string
  tipe: 'LM' | 'BR'
  step_order: number
  percentage: number
}

interface CustomerDetail {
  id: string
  nama: string
  bonus_threshold: number
  created_at: string
  discount_steps: DiscountStepRow[]
}

interface ProductInfo {
  nama: string
  tipe: 'LM' | 'BR'
}

interface TransactionLineFull {
  id: string
  product_id: string
  quantity: number
  harga_base: number
  harga_modal: number
  discounted_price: number
  omzet: number
  laba: number
  products: ProductInfo | null
}

interface TransactionFull {
  id: string
  nomor_bon: string
  tanggal: string
  status: string
  is_bonus: boolean
  ongkir: number
  deskripsi: string | null
  payment_date: string | null
  transaction_lines: TransactionLineFull[]
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function monthBoundaries(month: number, year: number) {
  const d = new Date(year, month - 1, 1)
  return {
    firstDay: format(startOfMonth(d), 'yyyy-MM-dd'),
    lastDay: format(endOfMonth(d), 'yyyy-MM-dd'),
  }
}

function monthLabel(month: number, year: number) {
  return `${MONTHS[month - 1]} ${year}`
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const now = new Date()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [transactions, setTransactions] = useState<TransactionFull[]>([])
  const [paidOmzet, setPaidOmzet] = useState(0)
  const [bonusGranted, setBonusGranted] = useState(0)
  const [bonusAvailable, setBonusAvailable] = useState(0)
  const [loading, setLoading] = useState(true)

  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1)
  const [filterYear, setFilterYear] = useState(now.getFullYear())

  const [settleTx, setSettleTx] = useState<TransactionFull | null>(null)
  const [settleDate, setSettleDate] = useState(format(now, 'yyyy-MM-dd'))
  const [settling, setSettling] = useState(false)

  const [settleAllOpen, setSettleAllOpen] = useState(false)
  const [settleAllDate, setSettleAllDate] = useState(format(now, 'yyyy-MM-dd'))
  const [settlingAll, setSettlingAll] = useState(false)

  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    let ignore = false

    async function load() {
      const custRes = await supabase
        .from('customers')
        .select('*, discount_steps(*)')
        .eq('id', id)
        .single()

      if (ignore) return
      if (!custRes.data) {
        setLoading(false)
        return
      }

      const cust = custRes.data as unknown as CustomerDetail
      setCustomer(cust)

      if (!ignore) {
        setLoading(false)
      }
    }

    load()

    return () => {
      ignore = true
    }
  }, [id])

  useEffect(() => {
    let ignore = false

    async function loadBonus() {
      const paid = await getCustomerPaidOmzet(id)
      const granted = await getCustomerBonusGranted(id)
      if (!ignore && customer) {
        const available = calculateBonusAvailable(paid, customer.bonus_threshold, granted)
        setPaidOmzet(paid)
        setBonusGranted(granted)
        setBonusAvailable(available)
      }
    }

    if (customer) loadBonus()

    return () => {
      ignore = true
    }
  }, [id, customer])

  useEffect(() => {
    const supabase = createClient()
    let ignore = false

    async function loadTx() {
      const { firstDay, lastDay } = monthBoundaries(filterMonth, filterYear)
      const { data } = await supabase
        .from('transactions')
        .select('*, transaction_lines(*, products(nama, tipe))')
        .eq('customer_id', id)
        .gte('tanggal', firstDay)
        .lte('tanggal', lastDay)
        .order('tanggal', { ascending: false })

      if (!ignore && data) {
        setTransactions(data as unknown as TransactionFull[])
      }
    }

    loadTx()

    return () => {
      ignore = true
    }
  }, [id, filterMonth, filterYear, refreshKey])

  function clearSuccess() {
    if (successMsg) setSuccessMsg(null)
  }

  function calcPerTipe(tipe: 'LM' | 'BR', txs: TransactionFull[]) {
    let omzet = 0
    let laba = 0
    for (const tx of txs) {
      if (tx.is_bonus) continue
      for (const line of tx.transaction_lines) {
        if (line.products?.tipe === tipe) {
          omzet += line.omzet ?? 0
          laba += line.laba ?? 0
        }
      }
    }
    return { omzet, laba }
  }

  const piutangTx = transactions.filter((tx) => tx.status === 'Piutang' && !tx.is_bonus)
  const lunasTx = transactions.filter((tx) => tx.status === 'Lunas' && !tx.is_bonus)

  const totalPiutang = piutangTx.reduce((s, tx) => {
    const omz = tx.transaction_lines.reduce((a, l) => a + (l.omzet ?? 0), 0)
    return s + omz + (tx.ongkir ?? 0)
  }, 0)

  const totalDibayar = lunasTx.reduce((s, tx) => {
    const omz = tx.transaction_lines.reduce((a, l) => a + (l.omzet ?? 0), 0)
    return s + omz + (tx.ongkir ?? 0)
  }, 0)

  const totalOmzetLunas = lunasTx.reduce((s, tx) => {
    return s + tx.transaction_lines.reduce((a, l) => a + (l.omzet ?? 0), 0)
  }, 0)

  const totalLaba = lunasTx.reduce((s, tx) => {
    return s + tx.transaction_lines.reduce((a, l) => a + (l.laba ?? 0), 0)
  }, 0)

  const lm = calcPerTipe('LM', lunasTx)
  const br = calcPerTipe('BR', lunasTx)

  const hasPiutang = piutangTx.length > 0

  async function handleSettleSingle() {
    if (!settleTx || !settleDate) return
    setSettling(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'Lunas', payment_date: settleDate })
      .eq('id', settleTx.id)

    if (error) {
      setSettling(false)
      return
    }

    setRefreshKey((k) => k + 1)
    setSuccessMsg(`Bon ${settleTx.nomor_bon} berhasil ditandai Lunas ✓`)
    setSettleTx(null)
    setSettleDate(format(new Date(), 'yyyy-MM-dd'))
    setSettling(false)
  }

  async function handleSettleAll() {
    if (!settleAllDate) return
    setSettlingAll(true)

    const supabase = createClient()
    const { firstDay, lastDay } = monthBoundaries(filterMonth, filterYear)
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'Lunas', payment_date: settleAllDate })
      .eq('customer_id', id)
      .eq('status', 'Piutang')
      .gte('tanggal', firstDay)
      .lte('tanggal', lastDay)

    if (error) {
      setSettlingAll(false)
      return
    }

    setRefreshKey((k) => k + 1)
    setSuccessMsg(`Semua transaksi ${monthLabel(filterMonth, filterYear)} berhasil ditandai Lunas ✓`)
    setSettleAllOpen(false)
    setSettleAllDate(format(new Date(), 'yyyy-MM-dd'))
    setSettlingAll(false)
  }

  function exportPDF() {
    const doc = new jsPDF()
    const margin = 14

    doc.setFontSize(16)
    doc.text(customer?.nama ?? 'Customer', margin, 22)

    doc.setFontSize(10)
    doc.text(`Periode: ${monthLabel(filterMonth, filterYear)}`, margin, 30)

    doc.setFontSize(11)
    doc.text('Ringkasan', margin, 40)

    const summaryRows = [
      ['Total Piutang', formatRupiah(totalPiutang)],
      ['Total Dibayar', formatRupiah(totalDibayar)],
      ['Total Omzet Lunas', formatRupiah(totalOmzetLunas)],
      ['Total Laba', formatRupiah(totalLaba)],
    ]

    autoTable(doc, {
      startY: 44,
      head: [['Item', 'Nilai']],
      body: summaryRows,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      margin: { left: margin, right: margin },
    })

    const breakdownY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

    doc.setFontSize(11)
    doc.text('Breakdown LM vs BR', margin, breakdownY)

    autoTable(doc, {
      startY: breakdownY + 4,
      head: [['Tipe', 'Omzet', 'Laba']],
      body: [
        ['LM', formatRupiah(lm.omzet), formatRupiah(lm.laba)],
        ['BR', formatRupiah(br.omzet), formatRupiah(br.laba)],
        ['Total', formatRupiah(lm.omzet + br.omzet), formatRupiah(lm.laba + br.laba)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      margin: { left: margin, right: margin },
    })

    const tableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

    doc.setFontSize(11)
    doc.text('Transaksi', margin, tableY)

    const txRows = transactions.map((tx) => {
      let lineOmzetLm = 0
      let lineOmzetBr = 0
      for (const line of tx.transaction_lines) {
        if (line.products?.tipe === 'LM') lineOmzetLm += line.omzet ?? 0
        else if (line.products?.tipe === 'BR') lineOmzetBr += line.omzet ?? 0
      }
      const total = lineOmzetLm + lineOmzetBr + (tx.ongkir ?? 0)
      return [
        formatDate(tx.tanggal),
        tx.nomor_bon,
        tx.is_bonus ? 'Bonus' : tx.status,
        formatRupiah(lineOmzetLm),
        formatRupiah(lineOmzetBr),
        formatRupiah(tx.ongkir ?? 0),
        tx.is_bonus ? 'Rp 0' : formatRupiah(total),
      ]
    })

    autoTable(doc, {
      startY: tableY + 4,
      head: [['Tanggal', 'No Bon', 'Status', 'LM', 'BR', 'Ongkir', 'Total']],
      body: txRows,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      margin: { left: margin, right: margin },
    })

    const safeName = (customer?.nama ?? 'Customer').replace(/[^a-zA-Z0-9]/g, '_')
    doc.save(`HL-${safeName}-${MONTHS[filterMonth - 1]}-${filterYear}.pdf`)
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-text-muted text-[15px]">Memuat...</div>
    )
  }

  if (!customer) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-text-muted text-[15px]">Pelanggan tidak ditemukan.</p>
        <Link
          href="/customers"
          className="text-text-secondary hover:text-text text-[15px]"
        >
          Kembali ke daftar pelanggan
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5" onClick={clearSuccess}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-text-muted">
        <Link href="/customers" className="hover:text-text transition-colors">
          Pelanggan
        </Link>
        <span>/</span>
        <span className="text-text-secondary">{customer.nama}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/customers"
            className="text-text-secondary hover:text-text text-[15px] transition-colors p-2 -ml-2"
          >
            &larr;<span className="hidden md:inline"> Kembali ke daftar pelanggan</span>
          </Link>
          <h1 className="text-[22px] md:text-[28px] font-bold text-text">{customer.nama}</h1>
        </div>
        <Link
          href={`/customers/${customer.id}/edit`}
          className="bg-accent hover:bg-[#256F28] text-white font-semibold rounded-xl px-6 py-3 text-[15px] transition-colors"
          style={{ height: 48 }}
        >
          Ubah Pelanggan
        </Link>
      </div>

      {/* Bonus Alert */}
      {bonusAvailable > 0 && (
        <BonusAlert
          customerId={customer.id}
          customerName={customer.nama}
          available={bonusAvailable}
        />
      )}

      {/* Bonus Info */}
      <div className="bg-bonus-bg border border-bonus/30 rounded-2xl p-4 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6 text-[14px] md:text-[15px]">
          <span className="text-text-secondary">
            Akumulasi Omzet:{' '}
            <span className="font-mono text-text font-medium">{formatRupiah(paidOmzet)}</span>
          </span>
          <span className="text-text-secondary">
            Bonus Available:{' '}
            <span className="font-mono text-bonus font-medium">{bonusAvailable}</span>
          </span>
          <span className="text-text-secondary">
            Sudah Diklaim:{' '}
            <span className="font-mono text-text font-medium">{bonusGranted}</span>
          </span>
        </div>
      </div>

      {/* Month Filter */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        <label className="text-[14px] text-text-secondary font-medium">Periode:</label>
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(parseInt(e.target.value))}
          className="w-full md:w-auto bg-surface border border-border rounded-xl px-4 py-3 text-[15px] text-text outline-none focus:border-accent transition-colors"
        >
          {MONTHS.map((name, i) => (
            <option key={i} value={i + 1}>{name}</option>
          ))}
        </select>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(parseInt(e.target.value))}
          className="w-full md:w-auto bg-surface border border-border rounded-xl px-4 py-3 text-[15px] text-text outline-none focus:border-accent transition-colors"
        >
          {Array.from({ length: 7 }, (_, i) => now.getFullYear() - 5 + i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Success Message */}
      {successMsg && (
        <div className="bg-lunas-bg border border-lunas/30 rounded-xl px-5 py-3.5 text-[14px] md:text-[15px] text-lunas font-medium text-center">
          {successMsg}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-surface rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <p className="text-[14px] text-text-secondary font-medium">
            Total Piutang
          </p>
          <p className="text-[20px] md:text-[28px] font-bold font-mono text-piutang mt-2">
            {formatRupiah(totalPiutang)}
          </p>
          <p className="text-[13px] text-text-muted mt-1">
            {piutangTx.length} transaksi
          </p>
        </div>
        <div className="bg-surface rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <p className="text-[14px] text-text-secondary font-medium">
            Sudah Dibayar
          </p>
          <p className="text-[20px] md:text-[28px] font-bold font-mono text-lunas mt-2">
            {formatRupiah(totalDibayar)}
          </p>
          <p className="text-[13px] text-text-muted mt-1">
            {lunasTx.length} transaksi
          </p>
        </div>
        <div className="bg-surface rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <p className="text-[14px] text-text-secondary font-medium">
            Omzet Lunas
          </p>
          <p className="text-[20px] md:text-[28px] font-bold font-mono text-text mt-2">
            {formatRupiah(totalOmzetLunas)}
          </p>
          <p className="text-[13px] text-text-muted mt-1">
            Bulan ini
          </p>
        </div>
        <div className="bg-surface rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <p className="text-[14px] text-text-secondary font-medium">
            Total Laba
          </p>
          <p className="text-[20px] md:text-[28px] font-bold font-mono text-accent mt-2">
            {formatRupiah(totalLaba)}
          </p>
          <p className="text-[13px] text-text-muted mt-1">
            Bulan ini
          </p>
        </div>
      </div>

      {/* LM vs BR Breakdown */}
      <div className="bg-surface rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="px-6 pt-6 pb-3">
          <h2 className="text-[18px] md:text-[22px] font-semibold text-text">
            Omzet LM vs BR
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[13px] uppercase tracking-wider font-semibold bg-surface-2">
                <th className="pb-3 pr-4 px-6 pt-3 text-left text-text-secondary font-semibold">Tipe</th>
                <th className="pb-3 pr-4 pt-3 text-right text-text-secondary font-semibold">Omzet</th>
                <th className="pb-3 pr-6 pt-3 text-right text-text-secondary font-semibold">Laba</th>
              </tr>
            </thead>
            <tbody className="text-[15px]">
              <tr className="border-b border-border odd:bg-surface-2/30" style={{ height: 64 }}>
                <td className="px-6 text-text font-medium">LM</td>
                <td className="pr-4 text-right font-mono text-text">
                  {formatRupiah(lm.omzet)}
                </td>
                <td className="pr-6 text-right font-mono text-text">
                  {formatRupiah(lm.laba)}
                </td>
              </tr>
              <tr className="border-b border-border odd:bg-surface-2/30" style={{ height: 64 }}>
                <td className="px-6 text-text font-medium">BR</td>
                <td className="pr-4 text-right font-mono text-text">
                  {formatRupiah(br.omzet)}
                </td>
                <td className="pr-6 text-right font-mono text-text">
                  {formatRupiah(br.laba)}
                </td>
              </tr>
              <tr className="border-b border-border odd:bg-surface-2/30" style={{ height: 64 }}>
                <td className="px-6 text-text font-semibold">Total</td>
                <td className="pr-4 text-right font-mono text-text font-semibold">
                  {formatRupiah(lm.omzet + br.omzet)}
                </td>
                <td className="pr-6 text-right font-mono text-text font-semibold">
                  {formatRupiah(lm.laba + br.laba)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions Table Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <h2 className="text-[18px] md:text-[22px] font-semibold text-text">
          Transaksi {monthLabel(filterMonth, filterYear)}
        </h2>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3 w-full md:w-auto">
          <button
            onClick={exportPDF}
            className="bg-surface-2 hover:bg-border text-text font-semibold rounded-xl px-5 py-2.5 text-[14px] transition-colors"
          >
            &#x2B07; Export PDF
          </button>
          {hasPiutang && (
            <button
              onClick={() => setSettleAllOpen(true)}
              className="bg-accent hover:bg-[#256F28] text-white font-semibold rounded-xl px-6 py-3 text-[15px] transition-colors"
              style={{ height: 48 }}
            >
              &#x2705; Tandai Semua Lunas
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-surface rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-text-muted text-[15px]">
              Belum ada transaksi untuk periode ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[13px] uppercase tracking-wider font-semibold bg-surface-2">
                  <th className="pb-3 pr-3 pt-4 px-6 text-left text-text-secondary font-semibold">Tanggal</th>
                  <th className="pb-3 pr-3 pt-4 text-left text-text-secondary font-semibold">Nomor Bon</th>
                  <th className="pb-3 pr-3 pt-4 text-left text-text-secondary font-semibold">Status</th>
                  <th className="pb-3 pr-3 pt-4 text-right text-text-secondary font-semibold">LM</th>
                  <th className="pb-3 pr-3 pt-4 text-right text-text-secondary font-semibold">BR</th>
                  <th className="pb-3 pr-3 pt-4 text-right text-text-secondary font-semibold">Ongkir</th>
                  <th className="pb-3 pr-3 pt-4 text-right text-text-secondary font-semibold">Total</th>
                  <th className="pb-3 pt-4 pr-6 text-left text-text-secondary font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-[15px]">
                {transactions.map((tx) => {
                  let lineOmzetLm = 0
                  let lineOmzetBr = 0
                  for (const line of tx.transaction_lines) {
                    if (line.products?.tipe === 'LM') lineOmzetLm += line.omzet ?? 0
                    else if (line.products?.tipe === 'BR') lineOmzetBr += line.omzet ?? 0
                  }
                  const totalAmt = lineOmzetLm + lineOmzetBr + (tx.ongkir ?? 0)

                  let badge: React.ReactNode
                  if (tx.is_bonus) {
                    badge = (
                      <span className="inline-block rounded-full px-3.5 py-1.5 text-[13px] font-semibold bg-bonus-bg text-bonus border border-bonus/30">
                        BONUS
                      </span>
                    )
                  } else if (tx.status === 'Lunas') {
                    badge = (
                      <span className="inline-block rounded-full px-3.5 py-1.5 text-[13px] font-semibold bg-lunas-bg text-lunas border border-lunas/30">
                        Lunas
                      </span>
                    )
                  } else {
                    badge = (
                      <span className="inline-block rounded-full px-3.5 py-1.5 text-[13px] font-semibold bg-piutang-bg text-piutang border border-piutang/30">
                        Piutang
                      </span>
                    )
                  }

                  return (
                    <tr
                      key={tx.id}
                      className="border-b border-border odd:bg-surface-2/30"
                      style={{ height: 64 }}
                    >
                      <td className="px-6 text-text-secondary whitespace-nowrap">
                        {formatDate(tx.tanggal)}
                      </td>
                      <td className="pr-3 font-mono text-text whitespace-nowrap">
                        {tx.nomor_bon}
                      </td>
                      <td className="pr-3 whitespace-nowrap">{badge}</td>
                      <td className="pr-3 text-right font-mono text-text whitespace-nowrap">
                        {tx.is_bonus ? '\u2014' : formatRupiah(lineOmzetLm)}
                      </td>
                      <td className="pr-3 text-right font-mono text-text whitespace-nowrap">
                        {tx.is_bonus ? '\u2014' : formatRupiah(lineOmzetBr)}
                      </td>
                      <td className="pr-3 text-right font-mono text-text whitespace-nowrap">
                        {tx.is_bonus ? '\u2014' : formatRupiah(tx.ongkir ?? 0)}
                      </td>
                      <td className="pr-3 text-right font-mono text-text font-medium whitespace-nowrap">
                        {tx.is_bonus ? '\u2014' : formatRupiah(totalAmt)}
                      </td>
                      <td className="pr-6 flex items-center gap-2 whitespace-nowrap">
                        {tx.status === 'Piutang' && !tx.is_bonus && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSettleTx(tx)
                              setSettleDate(format(new Date(), 'yyyy-MM-dd'))
                            }}
                            className="bg-lunas hover:bg-[#256F28] text-white font-semibold rounded-lg px-4 py-2 text-[13px] transition-colors"
                          >
                            &#x2705; Lunas
                          </button>
                        )}
                        <Link
                          href={`/transactions/${tx.id}`}
                          className="bg-surface-2 hover:bg-border text-text font-medium rounded-lg px-4 py-2 text-[13px] transition-colors"
                        >
                          &#x1F50D; Detail
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settlement Modal - Single */}
      {settleTx && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-t-2xl md:rounded-2xl p-6 md:p-8 w-full md:max-w-md mx-0 md:mx-4 max-h-[85vh] overflow-y-auto space-y-4 md:space-y-5">
            <div className="w-10 h-1 bg-text-muted rounded-full mx-auto mb-4 md:hidden" />
            <h3 className="text-[18px] md:text-[22px] font-bold text-text">
              Tandai {settleTx.nomor_bon} sebagai Lunas?
            </h3>
            <div>
              <label className="block text-[15px] text-text-secondary mb-1.5 font-medium">
                Tanggal Pelunasan
              </label>
              <input
                type="date"
                value={settleDate}
                onChange={(e) => setSettleDate(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3.5 text-[16px] text-text outline-none focus:border-accent transition-colors"
                style={{ height: 52 }}
              />
            </div>
            <div className="flex flex-col md:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSettleTx(null)}
                disabled={settling}
                className="w-full md:flex-1 bg-surface-2 hover:bg-border text-text font-semibold rounded-xl text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ height: 52 }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSettleSingle}
                disabled={settling || !settleDate}
                className="w-full md:flex-1 bg-accent hover:bg-[#256F28] text-white font-semibold rounded-xl text-[15px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ height: 52 }}
              >
                {settling ? 'Menyimpan...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settlement Modal - All */}
      {settleAllOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-t-2xl md:rounded-2xl p-6 md:p-8 w-full md:max-w-md mx-0 md:mx-4 max-h-[85vh] overflow-y-auto space-y-4 md:space-y-5">
            <div className="w-10 h-1 bg-text-muted rounded-full mx-auto mb-4 md:hidden" />
            <h3 className="text-[18px] md:text-[22px] font-bold text-text">
              Tandai SEMUA transaksi {monthLabel(filterMonth, filterYear)} sebagai Lunas?
            </h3>
            <p className="text-[15px] text-text-secondary">
              {piutangTx.length} transaksi Piutang akan ditandai Lunas.
            </p>
            <div>
              <label className="block text-[15px] text-text-secondary mb-1.5 font-medium">
                Tanggal Pelunasan
              </label>
              <input
                type="date"
                value={settleAllDate}
                onChange={(e) => setSettleAllDate(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3.5 text-[16px] text-text outline-none focus:border-accent transition-colors"
                style={{ height: 52 }}
              />
            </div>
            <div className="flex flex-col md:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSettleAllOpen(false)}
                disabled={settlingAll}
                className="w-full md:flex-1 bg-surface-2 hover:bg-border text-text font-semibold rounded-xl text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ height: 52 }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSettleAll}
                disabled={settlingAll || !settleAllDate}
                className="w-full md:flex-1 bg-accent hover:bg-[#256F28] text-white font-semibold rounded-xl text-[15px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ height: 52 }}
              >
                {settlingAll ? 'Menyimpan...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
