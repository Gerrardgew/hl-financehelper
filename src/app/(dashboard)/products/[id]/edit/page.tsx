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
      <div className="p-6 text-center text-text-muted text-[15px]">
        Memuat...
      </div>
    )
  }

  if (!product) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-text-muted text-[15px]">
          Produk tidak ditemukan.
        </p>
        <Link
          href="/products"
          className="text-accent hover:text-emerald-400 text-[15px]"
        >
          ← Kembali ke Produk
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
        <Link href="/products" className="hover:text-text transition-colors">
          Produk
        </Link>
        <span>/</span>
        <span className="text-text-secondary">Edit</span>
      </div>

      <h1 className="text-lg font-semibold text-text">
        Edit Produk: {product.nama}
      </h1>
      <ProductForm product={product} />
    </div>
  )
}
