'use client'

import { useEffect } from 'react'

export type ToastType = 'success' | 'error'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

const typeStyles: Record<ToastType, string> = {
  success: 'bg-lunas-bg border border-lunas/30 text-lunas',
  error: 'bg-danger-bg border border-danger/30 text-danger',
}

const typeIcons: Record<ToastType, string> = {
  success: '\u2705',
  error: '\u26A0\uFE0F',
}

export default function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  return (
    <div className="fixed top-4 right-4 left-4 md:left-auto md:w-auto z-[100] max-w-sm slide-in-right">
      <div className={`flex items-start gap-3 border rounded-xl px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${typeStyles[type]}`}>
        <span className="text-lg shrink-0 mt-0.5">{typeIcons[type]}</span>
        <p className="text-[14px] font-medium flex-1">{message}</p>
        <button
          onClick={onClose}
          className="text-current opacity-60 hover:opacity-100 shrink-0 ml-2 cursor-pointer text-lg leading-none"
        >
          \u2716
        </button>
      </div>
    </div>
  )
}
