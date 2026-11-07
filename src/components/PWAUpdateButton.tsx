import React, { useState } from 'react'
import { RefreshCw, CheckCircle, ArrowDownCircle } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

interface PWAUpdateButtonProps {
  className?: string
  showText?: boolean
}

export const PWAUpdateButton: React.FC<PWAUpdateButtonProps> = ({
  className = '',
  showText = false,
}) => {
  const [isChecking, setIsChecking] = useState(false)
  const [justChecked, setJustChecked] = useState(false)

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (r) {
        // Auto-check for updates every 60 seconds
        setInterval(async () => {
          if (!(!r.installing && navigator)) return
          if ('onLine' in navigator && !navigator.onLine) return
          const resp = await r.update()
          if (resp) {
            console.log('[PWA] Background check executed.')
          }
        }, 60 * 1000)
      }
    },
  })

  const handleManualCheck = async () => {
    if (needRefresh) {
      // Trigger instant update reload
      await updateServiceWorker(true)
      return
    }

    setIsChecking(true)
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          await registration.update()
          // If a new worker was found or installing
          if (registration.waiting || registration.installing) {
            await updateServiceWorker(true)
            return
          }
        }
      }
      // If no updates waiting, show quick check confirmation
      setJustChecked(true)
      setTimeout(() => setJustChecked(false), 2500)
    } catch (e) {
      console.error('[PWA] Check update error:', e)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleManualCheck}
      disabled={isChecking}
      title={
        needRefresh
          ? 'New update available! Click to update app.'
          : justChecked
          ? 'App is completely up to date!'
          : 'Check for updates & sync latest version'
      }
      aria-label="Check for App Updates"
      className={`relative h-10 px-3 rounded-2xl flex items-center justify-center gap-2 border text-xs font-bold transition-all duration-200 ${
        needRefresh
          ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 animate-pulse'
          : justChecked
          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
          : 'bg-slate-50 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
      } ${className}`}
    >
      {needRefresh ? (
        <>
          <ArrowDownCircle className="h-4 w-4 text-slate-950 animate-bounce" />
          <span className="font-extrabold">Update App</span>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
          </span>
        </>
      ) : justChecked ? (
        <>
          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          {showText && <span>Up to Date</span>}
        </>
      ) : (
        <>
          <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin text-indigo-600' : ''}`} />
          {showText && <span>{isChecking ? 'Checking...' : 'Check Updates'}</span>}
        </>
      )}
    </button>
  )
}
