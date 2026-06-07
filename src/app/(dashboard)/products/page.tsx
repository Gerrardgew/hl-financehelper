'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/utils'

interface ProductRow {
  id: string
  nama: string
  tipe: 'LM' | 'BR'
  harga_jual: number
  harga_modal: number
  is_deleted: boolean
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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
    if (!window.confirm(`Hapus produk "${nama}"?`)) return

    const supabase = createClient()
    const { error } = await supabase
      .from('products')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) {
      alert('Gagal menghapus produk')
      return
    }

    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (data) setProducts(data as ProductRow[])
  }

  const filtered = products.filter((p) =>
    p.nama.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
        <h1 className="text-[22px] md:text-[28px] font-bold text-text">Produk</h1>
        <Link
          href="/products/new"
          className="bg-accent hover:bg-[#256F28] text-white font-semibold rounded-xl px-6 py-3 text-[15px] transition-colors flex items-center gap-2"
          style={{ height: '48px' }}
        >
          {'\u2795'} Tambah Produk
        </Link>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface border border-border rounded-xl px-5 py-3 text-[16px] text-text placeholder-text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
          placeholder="Cari produk..."
          style={{ height: '52px' }}
        />
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        {loading ? (
          <div className="p-12 text-center text-text-muted text-[17px]">
            Memuat...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-[40px]">{'\uD83D\uDCE6'}</p>
            <p className="text-text-muted text-[17px]">
              Belum ada produk.
            </p>
            <Link
              href="/products/new"
              className="text-accent hover:text-[#256F28] text-[15px] font-semibold transition-colors"
            >
              + Tambah Produk untuk mulai
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[13px] text-text-secondary uppercase tracking-wider font-semibold bg-surface-2">
                  <th className="px-5 py-4 font-medium">Nama</th>
                  <th className="px-4 py-4 font-medium">Tipe</th>
                  <th className="px-4 py-4 text-right font-medium">Harga Jual</th>
                  <th className="px-4 py-4 text-right font-medium">Harga Modal</th>
                  <th className="px-4 py-4 text-right font-medium">Laba</th>
                  <th className="px-5 py-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-[15px]">
                {filtered.map((p, i) => {
                  const laba = p.harga_jual - p.harga_modal
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-border hover:bg-surface-2/50 transition-colors ${i % 2 === 1 ? 'bg-surface-2/30' : ''}`}
                      style={{ height: '64px' }}
                    >
                      <td className="px-5 text-text font-semibold">{p.nama}</td>
                      <td className="px-4">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-[13px] font-semibold ${
                            p.tipe === 'LM'
                              ? 'bg-blue-bg text-blue border border-blue/30'
                              : 'bg-purple-bg text-purple border border-purple/30'
                          }`}
                        >
                          {p.tipe}
                        </span>
                      </td>
                      <td className="px-4 text-right font-mono text-text">
                        {formatRupiah(p.harga_jual)}
                      </td>
                      <td className="px-4 text-right font-mono text-text-secondary">
                        {formatRupiah(p.harga_modal)}
                      </td>
                      <td className="px-4 text-right font-mono text-accent font-semibold">
                        {formatRupiah(laba)}
                      </td>
                      <td className="px-5">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/products/${p.id}/edit`}
                            className="bg-surface-2 hover:bg-border text-text font-medium rounded-lg px-4 py-2 text-[13px] transition-colors"
                          >
                            Ubah
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id, p.nama)}
                            className="text-danger hover:bg-danger-bg font-medium rounded-lg px-4 py-2 text-[13px] transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
