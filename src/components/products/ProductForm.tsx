'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/utils'

interface ProductFormProps {
  product?: {
    id: string
    nama: string
    tipe: 'LM' | 'BR'
    harga_modal: number
    harga_base: number
  }
}

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter()
  const isEdit = !!product

  const [nama, setNama] = useState(product?.nama ?? '')
  const [tipe, setTipe] = useState<'LM' | 'BR'>(product?.tipe ?? 'LM')
  const [hargaModal, setHargaModal] = useState(
    product?.harga_modal != null ? String(product.harga_modal) : ''
  )
  const [hargaBase, setHargaBase] = useState(
    product?.harga_base != null ? String(product.harga_base) : ''
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const numModal = parseInt(hargaModal) || 0
  const numBase = parseInt(hargaBase) || 0

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!nama.trim()) {
      setError('Nama produk wajib diisi.')
      return
    }
    if (numModal < 0) {
      setError('Harga modal tidak boleh negatif.')
      return
    }
    if (numBase < 0) {
      setError('Harga base tidak boleh negatif.')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      if (isEdit) {
        const { error: ue } = await supabase
          .from('products')
          .update({
            nama: nama.trim(),
            tipe,
            harga_modal: numModal,
            harga_base: numBase,
          })
          .eq('id', product!.id)
        if (ue) throw ue
      } else {
        const { error: ie } = await supabase.from('products').insert({
          nama: nama.trim(),
          tipe,
          harga_modal: numModal,
          harga_base: numBase,
        })
        if (ie) throw ie
      }

      setSaved(true)
      setTimeout(() => router.push('/products'), 800)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Gagal menyimpan produk.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      {saved && (
        <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg px-5 py-3.5 text-sm text-emerald-400 font-medium text-center">
          Produk berhasil disimpan ✓
        </div>
      )}

      {error && (
        <div className="bg-red-950/50 border border-red-800 rounded-lg px-5 py-3.5 text-sm text-red-400">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="nama"
          className="block text-sm font-medium text-text-secondary mb-1.5"
        >
          Nama Produk
        </label>
        <input
          id="nama"
          type="text"
          required
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-[15px] text-text placeholder-text-muted outline-none focus:border-accent transition-colors"
          placeholder="Contoh: Kemeja LM Polos"
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-text-secondary mb-2">
          Tipe Produk
        </legend>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="radio"
              name="tipe"
              value="LM"
              checked={tipe === 'LM'}
              onChange={() => setTipe('LM')}
              className="accent-emerald-500 w-4 h-4"
            />
            <span className="text-[15px] text-text">LM</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="radio"
              name="tipe"
              value="BR"
              checked={tipe === 'BR'}
              onChange={() => setTipe('BR')}
              className="accent-emerald-500 w-4 h-4"
            />
            <span className="text-[15px] text-text">BR</span>
          </label>
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="hargaModal"
          className="block text-sm font-medium text-text-secondary mb-1.5"
        >
          Harga Modal (Harga Beli HL)
        </label>
        <input
          id="hargaModal"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          required
          value={hargaModal}
          onChange={(e) => setHargaModal(e.target.value.replace(/\D/g, ''))}
          onBlur={() => {
            if (hargaModal === '') setHargaModal('0')
          }}
          className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-[15px] text-text font-mono placeholder-text-muted outline-none focus:border-accent transition-colors"
          placeholder="Contoh: 50000"
        />
        <p className="text-xs text-text-muted mt-1.5">
          Tidak ditampilkan ke customer
        </p>
      </div>

      <div>
        <label
          htmlFor="hargaBase"
          className="block text-sm font-medium text-text-secondary mb-1.5"
        >
          Harga Base (Harga Jual ke Customer)
        </label>
        <input
          id="hargaBase"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          required
          value={hargaBase}
          onChange={(e) => setHargaBase(e.target.value.replace(/\D/g, ''))}
          onBlur={() => {
            if (hargaBase === '') setHargaBase('0')
          }}
          className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-[15px] text-text font-mono placeholder-text-muted outline-none focus:border-accent transition-colors"
          placeholder="Contoh: 100000"
        />
      </div>

      {numModal > 0 && numBase > 0 && (
        <div className="bg-surface-2/50 border border-border rounded-lg px-5 py-3.5 space-y-1">
          <p className="text-sm text-text-secondary">
            Laba per unit:{' '}
            <span className="font-mono text-text font-medium">
              {formatRupiah(numBase - numModal)}
            </span>
          </p>
        </div>
      )}

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={saving || saved}
          className="bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg px-6 py-3 text-[15px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving
            ? 'Menyimpan...'
            : saved
              ? 'Tersimpan ✓'
              : isEdit
                ? 'Simpan Perubahan'
                : 'Tambah Produk'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/products')}
          className="text-text-secondary hover:text-text text-[15px] transition-colors"
        >
          ← Kembali ke Produk
        </button>
      </div>
    </form>
  )
}
