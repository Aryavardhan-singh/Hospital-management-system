import React, { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, ArrowRightLeft, Info, X } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ToastType = 'reroute' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  sub?: string
  createdAt: number
}

// ─────────────────────────────────────────────────────────────
// Hook to manage toast state (use in parent, pass push down)
// ─────────────────────────────────────────────────────────────

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((type: ToastType, message: string, sub?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, message, sub, createdAt: Date.now() }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, push, dismiss }
}

// ─────────────────────────────────────────────────────────────
// Individual Toast item
// ─────────────────────────────────────────────────────────────

const TOAST_LIFETIME_MS = 7000

const Toast: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(false)

  // Fade in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  // Auto-dismiss
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), TOAST_LIFETIME_MS)
    return () => clearTimeout(t)
  }, [toast.id, onDismiss])

  const Icon =
    toast.type === 'reroute' ? ArrowRightLeft
    : toast.type === 'warning' ? AlertTriangle
    : Info

  const iconBg =
    toast.type === 'reroute' ? 'bg-indigo-600'
    : toast.type === 'warning' ? 'bg-rose-500'
    : 'bg-slate-600'

  const border =
    toast.type === 'reroute' ? 'border-indigo-200'
    : toast.type === 'warning' ? 'border-rose-200'
    : 'border-slate-200'

  return (
    <div
      className={`flex items-start gap-3 w-80 bg-white border ${border} rounded-2xl shadow-[0_8px_32px_-4px_rgba(0,0,0,0.18)] p-4 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div
        className={`h-9 w-9 rounded-xl ${iconBg} text-white flex items-center justify-center shrink-0 shadow-md`}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-extrabold text-slate-900 leading-snug">{toast.message}</p>
        {toast.sub && (
          <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">{toast.sub}</p>
        )}
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="h-6 w-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ToastNotifications container (fixed bottom-right)
// ─────────────────────────────────────────────────────────────

interface ToastNotificationsProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export const ToastNotifications: React.FC<ToastNotificationsProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}
