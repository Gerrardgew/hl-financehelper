'use client'

import CustomerForm from '@/components/customers/CustomerForm'

export default function NewCustomerPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-lg font-semibold text-text">Buat Customer Baru</h1>
      <CustomerForm />
    </div>
  )
}
