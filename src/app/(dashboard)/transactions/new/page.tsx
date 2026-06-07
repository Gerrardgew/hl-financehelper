'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import BonForm from '@/components/transactions/BonForm'

function NewTransactionContent() {
  const searchParams = useSearchParams()
  const isBonus = searchParams.get('bonus') === 'true'
  const customerId = searchParams.get('customer') ?? undefined

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
        <span className="text-text-secondary">
          {isBonus ? 'Buat Bon Bonus' : 'Buat Bon Baru'}
        </span>
      </div>

      <h1 className="text-[22px] md:text-[28px] font-bold text-text">
        {isBonus ? 'Buat Bon Bonus' : 'Buat Bon Baru'}
      </h1>
      <BonForm defaultCustomerId={customerId} defaultIsBonus={isBonus || undefined} />
    </div>
  )
}

export default function NewTransactionPage() {
  return (
    <Suspense fallback={
      <div className="p-6 text-center text-text-muted text-[17px]">Memuat...</div>
    }>
      <NewTransactionContent />
    </Suspense>
  )
}
