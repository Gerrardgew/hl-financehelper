'use client'

import { useState, type FormEvent } from 'react'

interface SettleModalProps {
  nomorBon: string
  onConfirm: (tanggal: string) => Promise<void>
  onClose: () => void
}

export default function SettleModal({
  nomorBon,
  onConfirm,
  onClose,
}: SettleModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const [tanggal, setTanggal] = useState(today)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      await onConfirm(tanggal)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Gagal menandai lunas.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-8 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <h2 className="text-[22px] font-bold text-text mb-2">
          Tandai Lunas
        </h2>
        <p className="text-[15px] text-text-secondary mb-6">
          Bon <span className="font-mono font-semibold text-text">{nomorBon}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="settleDate"
              className="block text-[15px] font-semibold text-text mb-1.5"
            >
              Tanggal Pelunasan
            </label>
            <input
              id="settleDate"
              type="date"
              required
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3.5 text-[16px] text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
              style={{ height: '52px' }}
            />
          </div>

          {error && (
            <div className="bg-danger-bg border border-danger/30 rounded-xl px-4 py-3 text-[15px] text-danger font-medium">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-accent hover:bg-[#256F28] text-white font-semibold rounded-xl px-6 py-3 text-[15px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ height: '52px' }}
            >
              {saving ? 'Memproses...' : '\u2705 Konfirmasi Lunas'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-full bg-surface-2 hover:bg-border text-text font-semibold rounded-xl px-6 py-3 text-[15px] transition-colors disabled:opacity-50"
              style={{ height: '52px' }}
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
