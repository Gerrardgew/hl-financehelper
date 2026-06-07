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

interface CustomerOption {
  id: string
  nama: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('Semua')
  const [filterCustomer, setFilterCustomer] = useState('')

  useEffect(() => {
    let ignore = false
    const supabase = createClient()

    Promise.all([
      supabase
        .from('transactions')
        .select(
          'id, nomor_bon, tanggal, status, is_bonus, ongkir, customers(nama), transaction_lines(omzet)'
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('customers')
        .select('id, nama')
        .eq('is_deleted', false)
        .order('nama'),
    ]).then(([txRes, cRes]) => {
      if (!ignore) {
        if (txRes.data) setTransactions(txRes.data as unknown as TransactionRow[])
        if (cRes.data) setCustomers(cRes.data as CustomerOption[])
        setLoading(false)
      }
    })

    return () => {
      ignore = true
    }
  }, [])

  async function handleDelete(id: string) {
    if (
      !window.confirm(
        `Yakin ingin menghapus Bon ini? Aksi tidak bisa dibatalkan.`
      )
    )
      return

    const supabase = createClient()

    await supabase
      .from('transaction_lines')
      .delete()
      .eq('transaction_id', id)

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Gagal menghapus transaksi.')
      return
    }

    const { data } = await supabase
      .from('transactions')
      .select(
        'id, nomor_bon, tanggal, status, is_bonus, ongkir, customers(nama), transaction_lines(omzet)'
      )
      .order('created_at', { ascending: false })

    if (data) setTransactions(data as unknown as TransactionRow[])
  }

  const filtered = transactions.filter((tx) => {
    if (filterStatus !== 'Semua' && tx.status !== filterStatus) return false
    if (filterCustomer && tx.customers?.nama !== filterCustomer) return false
    return true
  })

  const totalPiutang = filtered
    .filter((tx) => tx.status === 'Piutang' && !tx.is_bonus)
    .reduce((s, tx) => {
      const omz = (tx.transaction_lines ?? []).reduce(
        (a, l) => a + (l.omzet ?? 0),
        0
      )
      return s + omz + (tx.ongkir ?? 0)
    }, 0)

  const totalLunas = filtered
    .filter((tx) => tx.status === 'Lunas' && !tx.is_bonus)
    .reduce((s, tx) => {
      const omz = (tx.transaction_lines ?? []).reduce(
        (a, l) => a + (l.omzet ?? 0),
        0
      )
      return s + omz + (tx.ongkir ?? 0)
    }, 0)

  if (loading) {
    return (
      <div className="p-6 text-center text-text-muted text-[15px]">
        Memuat...
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text">Transaksi</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Daftar semua bon penjualan
          </p>
        </div>
        <Link
          href="/transactions/new"
          className="bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg px-5 py-3 text-[15px] transition-colors"
        >
          + Buat Bon Baru
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent transition-colors"
        >
          <option value="Semua">Semua Status</option>
          <option value="Piutang">Piutang</option>
          <option value="Lunas">Lunas</option>
        </select>
        <select
          value={filterCustomer}
          onChange={(e) => setFilterCustomer(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent transition-colors"
        >
          <option value="">Semua Customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.nama}>
              {c.nama}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-text-muted text-[15px]">
              Belum ada transaksi.
            </p>
            <Link
              href="/transactions/new"
              className="text-accent hover:text-emerald-400 text-[15px]"
            >
              Buat bon baru
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-text-muted uppercase tracking-wider font-mono">
                  <th className="pb-3 pr-3 pt-4 px-5 font-medium">
                    Tanggal
                  </th>
                  <th className="pb-3 pr-3 pt-4 font-medium">Nomor Bon</th>
                  <th className="pb-3 pr-3 pt-4 font-medium">Customer</th>
                  <th className="pb-3 pr-3 pt-4 font-medium">Status</th>
                  <th className="pb-3 pr-3 pt-4 text-right font-medium">
                    Omzet
                  </th>
                  <th className="pb-3 pr-3 pt-4 text-right font-medium">
                    Ongkir
                  </th>
                  <th className="pb-3 pr-3 pt-4 text-right font-medium">
                    Total
                  </th>
                  <th className="pb-3 pt-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-[15px]">
                {filtered.map((tx) => {
                  const omzet = (tx.transaction_lines ?? []).reduce(
                    (s, l) => s + (l.omzet ?? 0),
                    0
                  )
                  const total = omzet + (tx.ongkir ?? 0)

                  let badge
                  if (tx.is_bonus) {
                    badge = (
                      <span className="inline-block bg-bonus/20 text-bonus border border-bonus/30 px-2.5 py-1 rounded text-xs font-mono font-medium">
                        Bonus
                      </span>
                    )
                  } else if (tx.status === 'Lunas') {
                    badge = (
                      <span className="inline-block bg-lunas/20 text-lunas border border-lunas/30 px-2.5 py-1 rounded text-xs font-mono font-medium">
                        Lunas
                      </span>
                    )
                  } else {
                    badge = (
                      <span className="inline-block bg-piutang/20 text-piutang border border-piutang/30 px-2.5 py-1 rounded text-xs font-mono font-medium">
                        Piutang
                      </span>
                    )
                  }

                  return (
                    <tr
                      key={tx.id}
                      className="border-t border-border hover:bg-surface-2/50 transition-colors"
                    >
                      <td className="py-4 pr-3 px-5 text-text-secondary whitespace-nowrap">
                        {formatDate(tx.tanggal)}
                      </td>
                      <td className="py-4 pr-3 font-mono text-text whitespace-nowrap">
                        {tx.nomor_bon}
                      </td>
                      <td className="py-4 pr-3 text-text whitespace-nowrap">
                        {tx.customers?.nama ?? '-'}
                      </td>
                      <td className="py-4 pr-3 whitespace-nowrap">
                        {badge}
                      </td>
                      <td className="py-4 pr-3 text-right font-mono text-text whitespace-nowrap">
                        {formatRupiah(omzet)}
                      </td>
                      <td className="py-4 pr-3 text-right font-mono text-text whitespace-nowrap">
                        {formatRupiah(tx.ongkir ?? 0)}
                      </td>
                      <td className="py-4 pr-3 text-right font-mono text-text font-medium whitespace-nowrap">
                        {formatRupiah(total)}
                      </td>
                      <td className="py-4 flex items-center gap-2 whitespace-nowrap">
                        <Link
                          href={`/transactions/${tx.id}`}
                          className="text-text-secondary hover:text-text text-[15px] transition-colors"
                        >
                          🔍 Detail
                        </Link>
                        <Link
                          href={`/transactions/${tx.id}/edit`}
                          className="text-text-secondary hover:text-text text-[15px] transition-colors"
                        >
                          ✏️ Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="text-text-secondary hover:text-danger text-[15px] transition-colors"
                        >
                          🗑️ Hapus
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

      {filtered.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5 flex items-center gap-8">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider">
              Total Piutang
            </p>
            <p className="text-lg font-mono text-piutang font-medium mt-1">
              {formatRupiah(totalPiutang)}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider">
              Total Lunas
            </p>
            <p className="text-lg font-mono text-lunas font-medium mt-1">
              {formatRupiah(totalLunas)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
