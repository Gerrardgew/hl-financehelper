'use client'

import Link from 'next/link'
import BonForm from '@/components/transactions/BonForm'

export default function NewTransactionPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
        <Link
          href="/transactions"
          className="hover:text-text transition-colors"
        >
          Transaksi
        </Link>
        <span>/</span>
        <span className="text-text-secondary">Buat Bon Baru</span>
      </div>

      <h1 className="text-lg font-semibold text-text">Buat Bon Baru</h1>
      <BonForm />
    </div>
  )
}
