'use client'

import Link from 'next/link'
import ProductForm from '@/components/products/ProductForm'

export default function NewProductPage() {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-text-muted">
        <Link href="/products" className="hover:text-text transition-colors">
          Produk
        </Link>
        <span>/</span>
        <span className="text-text-secondary">Tambah Baru</span>
      </div>

      <h1 className="text-[22px] md:text-[28px] font-bold text-text">Tambah Produk Baru</h1>
      <div className="max-w-[720px]">
        <ProductForm />
      </div>
    </div>
  )
}
