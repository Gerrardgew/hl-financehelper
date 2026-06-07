'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/utils'

interface DiscountStepRow {
  id: string
  customer_id: string
  tipe: 'LM' | 'BR'
  step_order: number
  percentage: number
}

interface CustomerRow {
  id: string
  nama: string
  bonus_threshold: number
  is_deleted: boolean
  discount_steps: DiscountStepRow[]
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let ignore = false
    const supabase = createClient()

    supabase
      .from('customers')
      .select('*, discount_steps(*)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!ignore) {
          if (data) setCustomers(data as unknown as CustomerRow[])
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  async function handleDelete(id: string, nama: string) {
    if (!window.confirm(`Hapus pelanggan "${nama}"?`)) return

    const supabase = createClient()
    const { error } = await supabase
      .from('customers')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) {
      alert('Gagal menghapus pelanggan')
      return
    }

    const { data } = await supabase
      .from('customers')
      .select('*, discount_steps(*)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (data) setCustomers(data as unknown as CustomerRow[])
  }

  function formatSteps(steps: DiscountStepRow[], tipe: 'LM' | 'BR'): string {
    const filtered = steps
      .filter((s) => s.tipe === tipe)
      .sort((a, b) => a.step_order - b.step_order)
    if (filtered.length === 0) return '\u2014'
    return filtered.map((s) => `${s.percentage}%`).join(' \u2192 ')
  }

  const filtered = customers.filter((c) =>
    c.nama.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
        <h1 className="text-[22px] md:text-[28px] font-bold text-text">Pelanggan</h1>
        <Link
          href="/customers/new"
          className="bg-accent hover:bg-[#256F28] text-white font-semibold rounded-xl px-6 py-3 text-[15px] transition-colors flex items-center gap-2"
          style={{ height: '48px' }}
        >
          {'\u2795'} Tambah Pelanggan
        </Link>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface border border-border rounded-xl px-5 py-3 text-[16px] text-text placeholder-text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
          placeholder="Cari pelanggan..."
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
            <p className="text-[40px]">{'\uD83D\uDC65'}</p>
            <p className="text-text-muted text-[17px]">
              Belum ada pelanggan.
            </p>
            <Link
              href="/customers/new"
              className="text-accent hover:text-[#256F28] text-[15px] font-semibold transition-colors"
            >
              + Tambah Pelanggan untuk mulai
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[13px] text-text-secondary uppercase tracking-wider font-semibold bg-surface-2">
                  <th className="px-5 py-4 font-medium">Nama</th>
                  <th className="px-4 py-4 font-medium">Diskon LM</th>
                  <th className="px-4 py-4 font-medium">Diskon BR</th>
                  <th className="px-4 py-4 font-medium">Batas Bonus</th>
                  <th className="px-5 py-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-[15px]">
                {filtered.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`border-b border-border hover:bg-surface-2/50 transition-colors ${i % 2 === 1 ? 'bg-surface-2/30' : ''}`}
                    style={{ height: '64px' }}
                  >
                    <td className="px-5">
                      <Link
                        href={`/customers/${c.id}`}
                        className="text-accent hover:text-[#256F28] hover:underline font-semibold transition-colors"
                      >
                        {c.nama}
                      </Link>
                    </td>
                    <td className="px-4 text-text-secondary font-mono text-[13px]">
                      {formatSteps(c.discount_steps, 'LM')}
                    </td>
                    <td className="px-4 text-text-secondary font-mono text-[13px]">
                      {formatSteps(c.discount_steps, 'BR')}
                    </td>
                    <td className="px-4 text-text font-mono">
                      {formatRupiah(c.bonus_threshold)}
                    </td>
                    <td className="px-5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/customers/${c.id}`}
                          className="bg-surface-2 hover:bg-border text-text font-medium rounded-lg px-4 py-2 text-[13px] transition-colors"
                        >
                          {'\uD83D\uDC41\uFE0F'} Detail
                        </Link>
                        <Link
                          href={`/customers/${c.id}/edit`}
                          className="bg-surface-2 hover:bg-border text-text font-medium rounded-lg px-4 py-2 text-[13px] transition-colors"
                        >
                          Ubah
                        </Link>
                        <button
                          onClick={() => handleDelete(c.id, c.nama)}
                          className="text-danger hover:bg-danger-bg font-medium rounded-lg px-4 py-2 text-[13px] transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
