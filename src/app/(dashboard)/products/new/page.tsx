'use client'

import Link from 'next/link'
import ProductForm from '@/components/products/ProductForm'

export default function NewProductPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
        <Link href="/products" className="hover:text-text transition-colors">
          Produk
        </Link>
        <span>/</span>
        <span className="text-text-secondary">Tambah Baru</span>
      </div>

      <h1 className="text-lg font-semibold text-text">Tambah Produk Baru</h1>
      <ProductForm />
    </div>
  )
}
