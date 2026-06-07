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
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-text mb-2">
          Tandai Lunas
        </h2>
        <p className="text-[15px] text-text-secondary mb-5">
          Bon <span className="font-mono text-text">{nomorBon}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="settleDate"
              className="block text-[15px] font-medium text-text-secondary mb-1.5"
            >
              Tanggal Pelunasan
            </label>
            <input
              id="settleDate"
              type="date"
              required
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-[15px] text-text outline-none focus:border-accent transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg px-5 py-3 text-[15px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Memproses...' : '✅ Konfirmasi Lunas'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="text-text-secondary hover:text-text text-[15px] transition-colors"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
