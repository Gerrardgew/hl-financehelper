'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ProductForm from '@/components/products/ProductForm'

interface ProductData {
  id: string
  nama: string
  tipe: 'LM' | 'BR'
  harga_modal: number
  harga_base: number
  is_deleted: boolean
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<ProductData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    const supabase = createClient()

    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!ignore) {
          if (data && !(data as ProductData).is_deleted)
            setProduct(data as ProductData)
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

  if (!product) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-text-muted text-[17px]">
          Produk tidak ditemukan.
        </p>
        <Link
          href="/products"
          className="text-accent hover:text-[#256F28] text-[15px] font-semibold"
        >
          {'\u2190'} Kembali ke Produk
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-text-muted">
        <Link href="/products" className="hover:text-text transition-colors">
          Produk
        </Link>
        <span>/</span>
        <span className="text-text-secondary">Edit</span>
      </div>

      <h1 className="text-[22px] md:text-[28px] font-bold text-text">
        Edit Produk: {product.nama}
      </h1>
      <div className="max-w-[720px]">
        <ProductForm product={product} />
      </div>
    </div>
  )
}
