'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import BonForm from '@/components/transactions/BonForm'

interface LineItemData {
  product_id: string
  tipe: 'LM' | 'BR'
  qty: number
  harga_base: number
  harga_modal: number
  discounted_price: number
  omzet: number
  laba: number
}

interface TransactionData {
  id: string
  nomor_bon: string
  tanggal: string
  customer_id: string
  deskripsi: string | null
  ongkir: number
  is_bonus: boolean
  status: string
  transaction_lines: {
    product_id: string
    quantity: number
    harga_base: number
    harga_modal: number
    discounted_price: number
    omzet: number
    laba: number
  }[]
}

export default function EditTransactionPage() {
  const { id } = useParams<{ id: string }>()
  const [tx, setTx] = useState<TransactionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    const supabase = createClient()

    supabase
      .from('transactions')
      .select('*, transaction_lines(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!ignore) {
          if (data) setTx(data as unknown as TransactionData)
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="p-6 text-center text-text-muted text-[17px]">
        Memuat...
      </div>
    )
  }

  if (!tx) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-text-muted text-[17px]">
          Transaksi tidak ditemukan.
        </p>
        <Link
          href="/transactions"
          className="text-accent hover:text-[#256F28] text-[15px] font-semibold"
        >
          {'\u2190'} Kembali ke Transaksi
        </Link>
      </div>
    )
  }

  const initialLines: LineItemData[] = tx.transaction_lines.map((l) => ({
    product_id: l.product_id,
    tipe: 'LM' as const,
    qty: l.quantity,
    harga_base: l.harga_base,
    harga_modal: l.harga_modal,
    discounted_price: l.discounted_price,
    omzet: l.omzet,
    laba: l.laba,
  }))

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-text-muted">
        <Link
          href="/transactions"
          className="hover:text-text transition-colors"
        >
          Transaksi
        </Link>
        <span>/</span>
        <span className="text-text-secondary">Edit</span>
      </div>

      <h1 className="text-[22px] md:text-[28px] font-bold text-text">
        Edit Bon: {tx.nomor_bon}
      </h1>
      <BonForm
        initialData={{
          id: tx.id,
          tanggal: tx.tanggal,
          nomor_bon: tx.nomor_bon,
          customer_id: tx.customer_id,
          deskripsi: tx.deskripsi,
          ongkir: tx.ongkir,
          is_bonus: tx.is_bonus,
          status: tx.status,
          lines: initialLines,
        }}
      />
    </div>
  )
}
