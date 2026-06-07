'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatDate } from '@/lib/utils'

interface TransactionRow {
  id: string
  nomor_bon: string
  tanggal: string
  status: string
  is_bonus: boolean
  ongkir: number
  customers: { nama: string } | null
  transaction_lines: { omzet: number }[]
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let ignore = false
    const supabase = createClient()

    supabase
      .from('transactions')
      .select('*, customers(nama), transaction_lines(omzet)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!ignore) {
          if (data) setTransactions(data as unknown as TransactionRow[])
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  const filtered = transactions.filter((tx) =>
    tx.nomor_bon.toLowerCase().includes(search.toLowerCase()) ||
    (tx.customers?.nama ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
        <h1 className="text-[22px] md:text-[28px] font-bold text-text">Transaksi</h1>
        <Link
          href="/transactions/new"
          className="bg-accent hover:bg-[#256F28] text-white font-semibold rounded-xl px-6 py-3 text-[15px] transition-colors flex items-center gap-2"
          style={{ height: '48px' }}
        >
          {'\u2795'} Buat Bon Baru
        </Link>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface border border-border rounded-xl px-5 py-3 text-[16px] text-text placeholder-text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
          placeholder="Cari nomor bon atau pelanggan..."
          style={{ height: '52px' }}
        />
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        {loading ? (
          <div className="p-12 text-center text-text-muted text-[17px]">
            Memuat...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-[40px]">{'\uD83E\uDDFE'}</p>
            <p className="text-text-muted text-[17px]">
              Belum ada transaksi.
            </p>
            <Link
              href="/transactions/new"
              className="text-accent hover:text-[#256F28] text-[15px] font-semibold transition-colors"
            >
              + Buat Bon Baru untuk mulai
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[13px] text-text-secondary uppercase tracking-wider font-semibold bg-surface-2">
                  <th className="px-5 py-4 font-medium">Tanggal</th>
                  <th className="px-4 py-4 font-medium">Nomor Bon</th>
                  <th className="px-4 py-4 font-medium">Pelanggan</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 text-right font-medium">Total</th>
                  <th className="px-5 py-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-[15px]">
                {filtered.map((tx, i) => {
                  const total =
                    tx.transaction_lines.reduce((s, l) => s + (l.omzet ?? 0), 0) +
                    (tx.ongkir ?? 0)

                  let badge
                  if (tx.is_bonus) {
                    badge = (
                      <span className="inline-block bg-bonus-bg text-bonus border border-bonus/30 rounded-full px-3.5 py-1.5 text-[13px] font-semibold">
                        Bonus
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
                    <tr
                      key={tx.id}
                      className={`border-b border-border hover:bg-surface-2/50 transition-colors ${i % 2 === 1 ? 'bg-surface-2/30' : ''}`}
                      style={{ height: '64px' }}
                    >
                      <td className="px-5 text-text-secondary whitespace-nowrap">
                        {formatDate(tx.tanggal)}
                      </td>
                      <td className="px-4 font-mono text-text whitespace-nowrap">
                        {tx.nomor_bon}
                      </td>
                      <td className="px-4 text-text whitespace-nowrap">
                        {tx.customers?.nama ?? '-'}
                      </td>
                      <td className="px-4 whitespace-nowrap">{badge}</td>
                      <td className="px-4 text-right font-mono text-text font-medium whitespace-nowrap">
                        {formatRupiah(total)}
                      </td>
                      <td className="px-5">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/transactions/${tx.id}`}
                            className="bg-surface-2 hover:bg-border text-text font-medium rounded-lg px-4 py-2 text-[13px] transition-colors"
                          >
                            {'\uD83D\uDD0D'} Detail
                          </Link>
                          {tx.status === 'Piutang' && !tx.is_bonus && (
                            <Link
                              href={`/transactions/${tx.id}/edit`}
                              className="bg-surface-2 hover:bg-border text-text font-medium rounded-lg px-4 py-2 text-[13px] transition-colors"
                            >
                              Ubah
                            </Link>
                          )}
                        </div>
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
