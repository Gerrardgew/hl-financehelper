'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/utils'
import ConfirmModal from '@/components/ui/ConfirmModal'
import Toast, { type ToastType } from '@/components/ui/Toast'

interface ProductRow {
  id: string
  nama: string
  tipe: 'LM' | 'BR'
  harga_base: number
  harga_modal: number
  is_deleted: boolean
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState<{ id: string; nama: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

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
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('products')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) {
      setToast({ message: 'Gagal menghapus produk', type: 'error' })
      setDeleting(false)
      setConfirm(null)
      return
    }

    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (data) setProducts(data as ProductRow[])
    setDeleting(false)
    setConfirm(null)
  }

  const handleCloseToast = useCallback(() => setToast(null), [])

  const filtered = products.filter((p) =>
    p.nama.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4 md:space-y-6">
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
      <div className="bg-surface border border-border rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
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
          <>
            {/* Mobile card view */}
            <div className="block md:hidden space-y-3">
              {filtered.map((p) => {
                const laba = (Number(p.harga_base) || 0) - (Number(p.harga_modal) || 0)
                return (
                  <div key={p.id} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-text font-semibold">{p.nama}</span>
                      <span className={`inline-block rounded-full px-3 py-1 text-[12px] font-semibold ${
                        p.tipe === 'LM'
                          ? 'bg-blue-bg text-blue border border-blue/30'
                          : 'bg-purple-bg text-purple border border-purple/30'
                      }`}>
                        {p.tipe}
                      </span>
                    </div>
                    <div className="space-y-1 text-[13px] text-text-secondary">
                      <p>Harga Jual: <span className="font-mono text-text">{formatRupiah(Number(p.harga_base) || 0)}</span></p>
                      <p>Harga Modal: <span className="font-mono text-text-secondary">{formatRupiah(Number(p.harga_modal) || 0)}</span></p>
                      <p>Laba: <span className="font-mono text-accent font-semibold">{formatRupiah(laba)}</span></p>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      <Link href={`/products/${p.id}/edit`} className="bg-surface-2 hover:bg-border text-text font-medium rounded-lg px-4 py-2 text-[13px] transition-colors">
                        Ubah
                      </Link>
                      <button onClick={() => setConfirm({ id: p.id, nama: p.nama })} className="text-danger hover:bg-danger-bg font-medium rounded-lg px-4 py-2 text-[13px] transition-colors">
                        Hapus
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Tablet/Desktop table */}
            <div className="hidden md:block">
              <div className="relative">
                <div id="shadow-left-prod" className="pointer-events-none absolute left-0 top-0 h-full w-8 z-10 opacity-0 transition-opacity bg-gradient-to-r from-surface to-transparent" />
                <div id="shadow-right-prod" className="pointer-events-none absolute right-0 top-0 h-full w-8 z-10 transition-opacity bg-gradient-to-l from-surface to-transparent" />
                <div
                  className="overflow-x-auto scroll-smooth table-scroll"
                  onScroll={(e) => {
                    const el = e.currentTarget
                    const shadowLeft = el.parentElement?.querySelector('#shadow-left-prod') as HTMLElement
                    const shadowRight = el.parentElement?.querySelector('#shadow-right-prod') as HTMLElement
                    if (shadowLeft) shadowLeft.style.opacity = el.scrollLeft > 0 ? '1' : '0'
                    if (shadowRight) shadowRight.style.opacity = el.scrollLeft < el.scrollWidth - el.clientWidth ? '1' : '0'
                  }}
                >
              <table className="w-full min-w-[500px]">
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
                    const laba = (Number(p.harga_base) || 0) - (Number(p.harga_modal) || 0)
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
                          {formatRupiah(Number(p.harga_base) || 0)}
                        </td>
                        <td className="px-4 text-right font-mono text-text-secondary">
                          {formatRupiah(Number(p.harga_modal) || 0)}
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
                              onClick={() => setConfirm({ id: p.id, nama: p.nama })}
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
          </div>
          <p className="text-xs text-text-muted text-right px-4 py-2 lg:hidden">
            &larr; Geser untuk lihat lebih &rarr;
          </p>
        </div>
          </>
        )}
      </div>

      {confirm && (
        <ConfirmModal
          open
          title="Hapus Produk"
          message={`Hapus produk "${confirm.nama}"?`}
          loading={deleting}
          loadingText="Menghapus..."
          onConfirm={() => handleDelete(confirm.id, confirm.nama)}
          onCancel={() => { setConfirm(null); setDeleting(false) }}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={handleCloseToast} />
      )}
    </div>
  )
}
