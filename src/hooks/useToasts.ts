import { useCallback, useState } from 'react'

export type ToastType = 'reroute' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  sub?: string
  createdAt: number
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((type: ToastType, message: string, sub?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((previous) => [...previous, { id, type, message, sub, createdAt: Date.now() }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id))
  }, [])

  return { toasts, push, dismiss }
}