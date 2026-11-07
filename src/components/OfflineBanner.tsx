import React from 'react'
import { WifiOff, CloudUpload, RefreshCw } from 'lucide-react'

interface OfflineBannerProps {
  isOnline: boolean
  queuedCount?: number
  isSyncing?: boolean
  onSyncNow?: () => void
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  queuedCount = 0,
  isSyncing = false,
  onSyncNow,
}) => {
  if (isOnline && queuedCount === 0 && !isSyncing) {
    return null
  }

  return (
    <aside
      aria-label="Offline status banner"
      className={`w-full py-2.5 px-4 transition-all duration-300 text-xs font-semibold flex items-center justify-between border-b ${
        !isOnline
          ? 'bg-amber-500/90 text-slate-950 border-amber-600/40 shadow-sm'
          : 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-2.5 mx-auto max-w-7xl w-full justify-between">
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <>
              <WifiOff className="h-4 w-4 shrink-0 text-slate-950 animate-pulse" />
              <span>
                <strong>Offline Mode Active:</strong> Showing cached Jaipur hospital &amp; ambulance data. Actions will queue automatically.
              </span>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
              <span>
                <strong>Connection Restored:</strong> Synchronizing {queuedCount} queued action{queuedCount === 1 ? '' : 's'} with Supabase...
              </span>
            </>
          ) : (
            <>
              <CloudUpload className="h-4 w-4 shrink-0" />
              <span>
                <strong>Back Online:</strong> All offline changes synchronized successfully.
              </span>
            </>
          )}
        </div>

        {queuedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-900/15 text-slate-950">
              {queuedCount} Action{queuedCount === 1 ? '' : 's'} Queued
            </span>
            {isOnline && onSyncNow && !isSyncing && (
              <button
                onClick={onSyncNow}
                className="px-2.5 py-1 rounded-xl bg-white text-slate-900 font-extrabold text-[11px] hover:bg-slate-100 transition-colors shadow-sm"
              >
                Sync Now
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
