'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/utils'

interface ProductRow {
  id: string
  nama: string
  tipe: 'LM' | 'BR'
  harga_modal: number
  harga_base: number
  is_deleted: boolean
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    const supabase = createClient()

    supabase
      .from('products')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!ignore) {
          if (data) setProducts(data as ProductRow[])
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  async function handleDelete(id: string, nama: string) {
    if (
      !window.confirm(
        `Yakin ingin menghapus produk "${nama}"? Data transaksi lama tetap tersimpan.`
      )
    )
      return

    const supabase = createClient()
    const { error } = await supabase
      .from('products')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) {
      alert('Gagal menghapus produk.')
      return
    }

    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (data) setProducts(data as ProductRow[])
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text">Produk</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Daftar semua produk yang tersedia
          </p>
        </div>
        <Link
          href="/products/new"
          className="bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg px-5 py-3 text-[15px] transition-colors"
        >
          + Tambah Produk
        </Link>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-muted text-[15px]">
            Memuat...
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-text-muted text-[15px]">
              Belum ada produk.
            </p>
            <Link
              href="/products/new"
              className="text-accent hover:text-emerald-400 text-[15px]"
            >
              Tambah produk baru
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-text-muted uppercase tracking-wider font-mono">
                  <th className="pb-3 pr-4 pt-4 px-5 font-medium">Nama</th>
                  <th className="pb-3 pr-4 pt-4 font-medium">Tipe</th>
                  <th className="pb-3 pr-4 pt-4 font-medium">Harga Modal</th>
                  <th className="pb-3 pr-4 pt-4 font-medium">Harga Base</th>
                  <th className="pb-3 pt-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-[15px]">
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-border hover:bg-surface-2/50 transition-colors"
                  >
                    <td className="py-4 pr-4 px-5 text-text font-medium whitespace-nowrap">
                      {p.nama}
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded text-xs font-mono font-medium border ${
                          p.tipe === 'LM'
                            ? 'bg-blue-900/40 text-blue-400 border-blue-800'
                            : 'bg-purple-900/40 text-purple-400 border-purple-800'
                        }`}
                      >
                        {p.tipe}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-text font-mono">
                      {formatRupiah(p.harga_modal)}
                    </td>
                    <td className="py-4 pr-4 text-text font-mono">
                      {formatRupiah(p.harga_base)}
                    </td>
                    <td className="py-4 flex items-center gap-3">
                      <Link
                        href={`/products/${p.id}/edit`}
                        className="text-text-secondary hover:text-text text-[15px] transition-colors"
                      >
                        ✏️ Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id, p.nama)}
                        className="text-text-secondary hover:text-danger text-[15px] transition-colors"
                      >
                        🗑️ Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
