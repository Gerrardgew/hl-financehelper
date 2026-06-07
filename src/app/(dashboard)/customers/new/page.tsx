'use client'

import CustomerForm from '@/components/customers/CustomerForm'

export default function NewCustomerPage() {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <h1 className="text-[22px] md:text-[28px] font-bold text-text">Tambah Pelanggan Baru</h1>
      <div className="max-w-[720px]">
        <CustomerForm />
      </div>
    </div>
  )
}
