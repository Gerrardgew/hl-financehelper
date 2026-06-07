'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatDate } from '@/lib/utils'
import SettleModal from '@/components/transactions/SettleModal'

interface LineItemRow {
  id: string
  product_id: string
  quantity: number
  harga_base: number
  harga_modal: number
  discounted_price: number
  omzet: number
  laba: number
  products: { nama: string; tipe: 'LM' | 'BR' } | null
}

interface TransactionDetail {
  id: string
  nomor_bon: string
  tanggal: string
  customer_id: string
  deskripsi: string | null
  ongkir: number
  is_bonus: boolean
  status: string
  payment_date: string | null
  customers: { nama: string } | null
  transaction_lines: LineItemRow[]
}

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tx, setTx] = useState<TransactionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSettle, setShowSettle] = useState(false)

  useEffect(() => {
    let ignore = false
    const supabase = createClient()

    supabase
      .from('transactions')
      .select(
        '*, customers(nama), transaction_lines(*, products(nama, tipe))'
      )
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!ignore) {
          if (data) setTx(data as unknown as TransactionDetail)
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [id])

  async function handleSettle(tanggal: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'Lunas', payment_date: tanggal })
      .eq('id', id)
    if (error) throw error

    setTx(
      (prev) =>
        prev
          ? { ...prev, status: 'Lunas', payment_date: tanggal }
          : prev
    )
    setShowSettle(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[15px] text-text-muted">Memuat...</p>
      </div>
    )
  }

  if (!tx) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <span className="text-5xl">📄</span>
        <p className="text-[15px] text-text-muted">Transaksi tidak ditemukan.</p>
        <Link
          href="/transactions"
          className="text-[13px] text-text-muted hover:text-text transition-colors"
        >
          Kembali ke daftar transaksi
        </Link>
      </div>
    )
  }

  const totalOmzet = tx.transaction_lines.reduce(
    (s, l) => s + (l.omzet ?? 0),
    0
  )
  const totalLaba = tx.transaction_lines.reduce(
    (s, l) => s + (l.laba ?? 0),
    0
  )
  const totalTagihan = totalOmzet + (tx.ongkir ?? 0)

  let statusBadge
  if (tx.is_bonus) {
    statusBadge = (
      <span className="inline-block rounded-full px-3.5 py-1.5 text-[13px] font-semibold bg-bonus-bg text-bonus border border-bonus/30">
        Bonus
      </span>
    )
  } else if (tx.status === 'Lunas') {
    statusBadge = (
      <span className="inline-block rounded-full px-3.5 py-1.5 text-[13px] font-semibold bg-lunas-bg text-lunas border border-lunas/30">
        Lunas
      </span>
    )
  } else {
    statusBadge = (
      <span className="inline-block rounded-full px-3.5 py-1.5 text-[13px] font-semibold bg-piutang-bg text-piutang border border-piutang/30">
        Piutang
      </span>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center gap-2 text-[13px] text-text-muted">
        <Link href="/transactions" className="hover:text-text transition-colors">
          Transaksi
        </Link>
        <span>/</span>
        <span className="text-text-secondary">Detail</span>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
        <h1 className="text-[22px] md:text-[28px] font-bold text-text">Detail Transaksi</h1>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-[15px] font-semibold text-text">Nomor Bon</span>
            <div className="text-[15px] text-text font-mono mt-0.5">{tx.nomor_bon}</div>
          </div>
          <div>
            <span className="text-[15px] font-semibold text-text">Tanggal</span>
            <div className="text-[15px] text-text mt-0.5">{formatDate(tx.tanggal)}</div>
          </div>
          <div>
            <span className="text-[15px] font-semibold text-text">Pelanggan</span>
            <div className="text-[15px] text-text mt-0.5">{tx.customers?.nama ?? '-'}</div>
          </div>
          <div>
            <span className="text-[15px] font-semibold text-text">Status</span>
            <div className="mt-0.5">{statusBadge}</div>
          </div>
          {tx.deskripsi && (
            <div className="col-span-2">
              <span className="text-[15px] font-semibold text-text">Deskripsi</span>
              <div className="text-[15px] text-text mt-0.5">{tx.deskripsi}</div>
            </div>
          )}
          {tx.payment_date && (
            <div>
              <span className="text-[15px] font-semibold text-text">Tanggal Lunas</span>
              <div className="text-[15px] text-text mt-0.5">{formatDate(tx.payment_date)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <h2 className="text-[18px] md:text-[22px] font-semibold text-text mb-4">Produk</h2>
        <div className="overflow-x-auto relative">
          <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-surface to-transparent z-10" />
          <table className="w-full">
            <thead>
              <tr className="text-[13px] uppercase tracking-wider font-semibold text-text-secondary bg-surface-2">
                <th className="px-4 py-3 text-left rounded-l-lg">Produk</th>
                <th className="px-4 py-3 text-left">Tipe</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Harga Base</th>
                <th className="px-4 py-3 text-right">Diskon</th>
                <th className="px-4 py-3 text-right">Omzet</th>
                <th className="px-4 py-3 text-right rounded-r-lg">Laba</th>
              </tr>
            </thead>
            <tbody>
              {tx.transaction_lines.map((line) => (
                <tr
                  key={line.id}
                  className="border-b border-border"
                >
                  <td className="px-4 py-5 align-middle text-[15px] text-text">
                    {line.products?.nama ?? '-'}
                  </td>
                  <td className="px-4 py-5 align-middle">
                    <span
                      className={`inline-block px-2.5 py-1 rounded text-[12px] font-semibold border ${
                        line.products?.tipe === 'LM'
                          ? 'bg-blue-900/40 text-blue-400 border-blue-800'
                          : 'bg-purple-900/40 text-purple-400 border-purple-800'
                      }`}
                    >
                      {line.products?.tipe ?? '-'}
                    </span>
                  </td>
                  <td className="px-4 py-5 align-middle text-right font-mono text-[15px] text-text">
                    {line.quantity}
                  </td>
                  <td className="px-4 py-5 align-middle text-right font-mono text-[15px] text-text">
                    {formatRupiah(line.harga_base)}
                  </td>
                  <td className="px-4 py-5 align-middle text-right font-mono text-[15px] text-text">
                    {formatRupiah(line.discounted_price)}
                  </td>
                  <td className="px-4 py-5 align-middle text-right font-mono text-[15px] text-accent font-medium">
                    {formatRupiah(line.omzet)}
                  </td>
                  <td className="px-4 py-5 align-middle text-right font-mono text-[15px] text-accent font-medium">
                    {formatRupiah(line.laba)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 space-y-3 max-w-md shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <div className="flex justify-between">
          <span className="text-[15px] text-text-secondary">Total Omzet</span>
          <span className="text-[15px] font-mono text-text">
            {formatRupiah(totalOmzet)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[15px] text-text-secondary">Ongkir</span>
          <span className="text-[15px] font-mono text-text">
            {formatRupiah(tx.ongkir ?? 0)}
          </span>
        </div>
        <div className="border-t border-border pt-3 flex justify-between">
          <span className="text-[15px] font-semibold text-text">Total</span>
          <span className="font-mono text-text font-bold text-lg">
            {formatRupiah(totalTagihan)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[15px] text-text-secondary">Total Laba</span>
          <span className="text-[15px] font-mono text-accent font-medium">
            {formatRupiah(totalLaba)}
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <Link
          href="/transactions"
          className="inline-flex items-center justify-center bg-surface-2 hover:bg-border text-text font-semibold rounded-xl px-6 py-3 text-[15px] transition-colors"
          style={{ height: '48px' }}
        >
          {'\u2190'} Kembali
        </Link>
        {tx.status === 'Piutang' && !tx.is_bonus && (
          <button
            onClick={() => setShowSettle(true)}
            className="bg-accent hover:bg-[#256F28] text-white font-semibold rounded-xl px-6 py-3 text-[15px] transition-colors"
            style={{ height: '48px' }}
          >
            {'\u2705'} Tandai Lunas
          </button>
        )}
        <Link
          href={`/transactions/${tx.id}/edit`}
          className="inline-flex items-center justify-center bg-surface-2 hover:bg-border text-text font-semibold rounded-xl px-6 py-3 text-[15px] transition-colors"
          style={{ height: '48px' }}
        >
          Ubah
        </Link>
        <button className="inline-flex items-center justify-center bg-surface-2 hover:bg-border text-text font-semibold rounded-xl px-6 py-3 text-[15px] transition-colors"
          style={{ height: '48px' }}>
          {'\u2B07'} Export PDF
        </button>
      </div>

      {showSettle && (
        <SettleModal
          nomorBon={tx.nomor_bon}
          onConfirm={handleSettle}
          onClose={() => setShowSettle(false)}
        />
      )}
    </div>
  )
}
