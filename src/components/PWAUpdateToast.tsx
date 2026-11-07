import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Shows a subtle "New version available – tap to update" banner at the top
 * of the screen whenever the service worker detects a fresh build.
 * With skipWaiting:true in vite.config, the new SW activates immediately;
 * this toast just reloads the page so the user gets the new assets right away.
 */
export default function PWAUpdateToast() {
  const [show, setShow] = useState(false)

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onNeedRefresh() {
      setShow(true)
    },
    onOfflineReady() {
      // App is cached and ready for offline use — no toast needed here,
      // the offline banner in useNetworkStatus handles that.
    },
  })

  // Auto-hide if user doesn't interact after 12 s
  useEffect(() => {
    if (!needRefresh) return
    const t = window.setTimeout(() => setShow(false), 12_000)
    return () => window.clearTimeout(t)
  }, [needRefresh])

  if (!show) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-3 z-[9999] flex -translate-x-1/2 items-center gap-3 rounded-full border border-teal-200 bg-teal-700 px-4 py-2 shadow-xl"
      style={{ maxWidth: 'calc(100vw - 2rem)' }}
    >
      <span className="text-xs font-semibold text-white">
        🔄 New version available
      </span>
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="rounded-full bg-white px-3 py-1 text-xs font-bold text-teal-800 hover:bg-teal-50"
      >
        Update now
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setShow(false)}
        className="ml-1 text-teal-200 hover:text-white"
      >
        ✕
      </button>
    </div>
  )
}
