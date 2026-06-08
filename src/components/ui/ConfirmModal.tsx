'use client'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'default'
  loading?: boolean
  loadingText?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = 'Ya, Hapus',
  cancelText = 'Batal',
  variant = 'danger',
  loading = false,
  loadingText = 'Menghapus...',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null

  const confirmClass =
    variant === 'danger'
      ? 'bg-danger hover:bg-[#A51D1D] text-white'
      : 'bg-accent hover:bg-[#256F28] text-white'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60">
      <div className="bg-surface border border-border rounded-t-2xl md:rounded-2xl p-6 md:p-8 w-full md:max-w-md mx-0 md:mx-4 max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 bg-text-muted rounded-full mx-auto mb-4 md:hidden" />
        <h3 className="text-[22px] font-bold text-text mb-2">{title}</h3>
        <p className="text-[15px] text-text-secondary mb-6 whitespace-pre-line">{message}</p>
        <div className="flex flex-col md:flex-row gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-surface-2 hover:bg-border text-text font-semibold rounded-xl py-3 text-[15px] h-[52px] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 font-semibold rounded-xl py-3 text-[15px] h-[52px] transition-colors disabled:opacity-50 cursor-pointer ${confirmClass}`}
          >
            {loading ? loadingText : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
