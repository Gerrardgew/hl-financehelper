'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CustomerForm from '@/components/customers/CustomerForm'

interface DiscountStepData {
  percentage: number
}

interface CustomerData {
  id: string
  nama: string
  bonus_threshold: number
  discount_steps: {
    tipe: 'LM' | 'BR'
    step_order: number
    percentage: number
  }[]
}

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<CustomerData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    const supabase = createClient()

    supabase
      .from('customers')
      .select('*, discount_steps(*)')
      .eq('id', id)
      .single()
      .then(({ data: customer }) => {
        if (!ignore) {
          if (customer) setData(customer as unknown as CustomerData)
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

  if (!data) {
    return (
      <div className="p-6 text-text-muted text-sm">
        Customer tidak ditemukan.
      </div>
    )
  }

  const stepsLM: DiscountStepData[] = (data.discount_steps ?? [])
    .filter((s) => s.tipe === 'LM')
    .sort((a, b) => a.step_order - b.step_order)
    .map((s) => ({ percentage: s.percentage }))

  const stepsBR: DiscountStepData[] = (data.discount_steps ?? [])
    .filter((s) => s.tipe === 'BR')
    .sort((a, b) => a.step_order - b.step_order)
    .map((s) => ({ percentage: s.percentage }))

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-lg font-semibold text-text">
        Edit Customer: {data.nama}
      </h1>
      <CustomerForm
        customer={{
          id: data.id,
          nama: data.nama,
          bonus_threshold: data.bonus_threshold,
        }}
        stepsLM={stepsLM}
        stepsBR={stepsBR}
      />
    </div>
  )
}
