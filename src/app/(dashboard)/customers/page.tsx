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
    if (!window.confirm(`Hapus customer "${nama}"?`)) return

    const supabase = createClient()
    const { error } = await supabase
      .from('customers')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) {
      alert('Gagal menghapus customer')
      return
    }

    const { data } = await supabase
      .from('customers')
      .select('*, discount_steps(*)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (data) setCustomers(data as unknown as CustomerRow[])
  }

  function formatSteps(
    steps: DiscountStepRow[],
    tipe: 'LM' | 'BR'
  ): string {
    const filtered = steps
      .filter((s) => s.tipe === tipe)
      .sort((a, b) => a.step_order - b.step_order)

    if (filtered.length === 0) return '—'

    return filtered.map((s) => `${s.percentage}%`).join(' → ')
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text">Customers</h1>
        <Link
          href="/customers/new"
          className="bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
        >
          + Buat Customer
        </Link>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-muted text-sm">
            Memuat...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-text-muted text-sm">
            Belum ada customer.{' '}
            <Link
              href="/customers/new"
              className="text-accent hover:text-emerald-400"
            >
              Buat customer baru
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-text-muted uppercase tracking-wider font-mono">
                  <th className="pb-3 pr-4 pt-4 px-5 font-medium">Nama</th>
                  <th className="pb-3 pr-4 pt-4 font-medium">Diskon LM</th>
                  <th className="pb-3 pr-4 pt-4 font-medium">Diskon BR</th>
                  <th className="pb-3 pr-4 pt-4 font-medium">
                    Bonus Threshold
                  </th>
                  <th className="pb-3 pt-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-border hover:bg-surface-2/50 transition-colors"
                  >
                    <td className="py-3 pr-4 px-5 text-text font-medium">
                      {c.nama}
                    </td>
                    <td className="py-3 pr-4 text-text-secondary font-mono text-xs">
                      {formatSteps(c.discount_steps, 'LM')}
                    </td>
                    <td className="py-3 pr-4 text-text-secondary font-mono text-xs">
                      {formatSteps(c.discount_steps, 'BR')}
                    </td>
                    <td className="py-3 pr-4 text-text font-mono">
                      {formatRupiah(c.bonus_threshold)}
                    </td>
                    <td className="py-3 flex items-center gap-2">
                      <Link
                        href={`/customers/${c.id}/edit`}
                        className="text-text-secondary hover:text-text text-xs transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(c.id, c.nama)}
                        className="text-text-secondary hover:text-danger text-xs transition-colors"
                      >
                        Hapus
                      </button>
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
