'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/utils'

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

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    const supabase = createClient()

    supabase
      .from('customers')
      .select('*, discount_steps(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!ignore) {
          if (data) setCustomer(data as unknown as CustomerDetail)
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="p-6 text-center text-text-muted text-sm">Memuat...</div>
    )
  }

  if (!customer) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-text-muted text-sm">Customer tidak ditemukan.</p>
        <Link
          href="/customers"
          className="text-accent hover:text-emerald-400 text-sm"
        >
          Kembali ke daftar customer
        </Link>
      </div>
    )
  }

  function formatSteps(tipe: 'LM' | 'BR', c: CustomerDetail) {
    const steps = c.discount_steps
      .filter((s) => s.tipe === tipe)
      .sort((a, b) => a.step_order - b.step_order)
    if (steps.length === 0) return '—'
    return steps.map((s) => `${s.percentage}%`).join(' → ')
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text">{customer.nama}</h1>
        <Link
          href={`/customers/${customer.id}/edit`}
          className="bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
        >
          Edit Customer
        </Link>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-4 max-w-lg">
        <div className="flex justify-between">
          <span className="text-sm text-text-secondary">Bonus Threshold</span>
          <span className="text-sm text-text font-mono">
            {formatRupiah(customer.bonus_threshold)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-text-secondary">Diskon LM</span>
          <span className="text-sm text-text-secondary font-mono">
            {formatSteps('LM', customer)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-text-secondary">Diskon BR</span>
          <span className="text-sm text-text-secondary font-mono">
            {formatSteps('BR', customer)}
          </span>
        </div>
      </div>

      <Link
        href="/customers"
        className="text-text-secondary hover:text-text text-sm transition-colors"
      >
        ← Kembali
      </Link>
    </div>
  )
}
