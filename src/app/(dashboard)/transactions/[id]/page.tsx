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
      <div className="p-6 text-center text-text-muted text-[15px]">
        Memuat...
      </div>
    )
  }

  if (!tx) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-text-muted text-[15px]">
          Transaksi tidak ditemukan.
        </p>
        <Link
          href="/transactions"
          className="text-accent hover:text-emerald-400 text-[15px]"
        >
          ← Kembali ke Transaksi
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
      <span className="inline-block bg-bonus/20 text-bonus border border-bonus/30 px-3 py-1.5 rounded text-sm font-mono font-medium">
        Bonus
      </span>
    )
  } else if (tx.status === 'Lunas') {
    statusBadge = (
      <span className="inline-block bg-lunas/20 text-lunas border border-lunas/30 px-3 py-1.5 rounded text-sm font-mono font-medium">
        Lunas
      </span>
    )
  } else {
    statusBadge = (
      <span className="inline-block bg-piutang/20 text-piutang border border-piutang/30 px-3 py-1.5 rounded text-sm font-mono font-medium">
        Piutang
      </span>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text">
            Bon {tx.nomor_bon}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {tx.customers?.nama ?? '-'} — {formatDate(tx.tanggal)}
          </p>
        </div>
        <div className="flex items-center gap-3">{statusBadge}</div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-4 max-w-lg">
        <div className="flex justify-between">
          <span className="text-sm text-text-secondary">Nomor Bon</span>
          <span className="text-sm text-text font-mono">{tx.nomor_bon}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-text-secondary">Tanggal</span>
          <span className="text-sm text-text">
            {formatDate(tx.tanggal)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-text-secondary">Customer</span>
          <span className="text-sm text-text">
            {tx.customers?.nama ?? '-'}
          </span>
        </div>
        {tx.deskripsi && (
          <div className="flex justify-between">
            <span className="text-sm text-text-secondary">Deskripsi</span>
            <span className="text-sm text-text">{tx.deskripsi}</span>
          </div>
        )}
        {tx.payment_date && (
          <div className="flex justify-between">
            <span className="text-sm text-text-secondary">
              Tanggal Lunas
            </span>
            <span className="text-sm text-text">
              {formatDate(tx.payment_date)}
            </span>
          </div>
        )}
      </div>

      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-base font-medium text-text mb-4">
          Item Produk
        </h2>
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
                <th className="pb-3 text-right font-medium">Omzet</th>
              </tr>
            </thead>
            <tbody className="text-[15px]">
              {tx.transaction_lines.map((line) => (
                <tr
                  key={line.id}
                  className="border-t border-border"
                >
                  <td className="py-3 pr-3 text-text">
                    {line.products?.nama ?? '-'}
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-mono font-medium border ${
                        line.products?.tipe === 'LM'
                          ? 'bg-blue-900/40 text-blue-400 border-blue-800'
                          : 'bg-purple-900/40 text-purple-400 border-purple-800'
                      }`}
                    >
                      {line.products?.tipe ?? '-'}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-right font-mono text-text">
                    {line.quantity}
                  </td>
                  <td className="py-3 pr-3 text-right font-mono text-text">
                    {formatRupiah(line.harga_base)}
                  </td>
                  <td className="py-3 pr-3 text-right font-mono text-text">
                    {formatRupiah(line.discounted_price)}
                  </td>
                  <td className="py-3 text-right font-mono text-accent font-medium">
                    {formatRupiah(line.omzet)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-2 max-w-md">
        <div className="flex justify-between text-[15px]">
          <span className="text-text-secondary">Total Omzet</span>
          <span className="font-mono text-text">
            {formatRupiah(totalOmzet)}
          </span>
        </div>
        <div className="flex justify-between text-[15px]">
          <span className="text-text-secondary">Ongkir</span>
          <span className="font-mono text-text">
            {formatRupiah(tx.ongkir ?? 0)}
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

      <div className="flex items-center gap-4">
        {tx.status === 'Piutang' && !tx.is_bonus && (
          <button
            onClick={() => setShowSettle(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg px-5 py-3 text-[15px] transition-colors"
          >
            ✅ Tandai Lunas
          </button>
        )}
        <Link
          href={`/transactions/${tx.id}/edit`}
          className="text-text-secondary hover:text-text text-[15px] transition-colors"
        >
          ✏️ Edit Bon
        </Link>
        <Link
          href="/transactions"
          className="text-text-secondary hover:text-text text-[15px] transition-colors"
        >
          ← Kembali
        </Link>
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
