import React from 'react'
import { Button } from './ui/button'
import { Database, RefreshCw, Activity, AlertTriangle } from 'lucide-react'
import { Hospital, Ambulance, getCapacityLevel } from '@/types'

interface HeaderProps {
  hospitals: Hospital[]
  ambulances: Ambulance[]
  isLive: boolean
  isConfigured: boolean
  isSeeding: boolean
  onSeed: () => void
  onRefresh: () => void
}

export const Header: React.FC<HeaderProps> = ({
  hospitals,
  ambulances,
  isLive,
  isConfigured,
  isSeeding,
  onSeed,
  onRefresh,
}) => {
  const totalBeds = hospitals.reduce((acc, h) => acc + h.total_beds, 0)
  const occupiedBeds = hospitals.reduce((acc, h) => acc + h.occupied_beds, 0)
  const totalIcu = hospitals.reduce((acc, h) => acc + h.icu_beds, 0)
  const occupiedIcu = hospitals.reduce((acc, h) => acc + h.icu_occupied, 0)

  const bedPercentage = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
  const icuPercentage = totalIcu > 0 ? Math.round((occupiedIcu / totalIcu) * 100) : 0

  const bedStatus = getCapacityLevel(occupiedBeds, totalBeds)
  const icuStatus = getCapacityLevel(occupiedIcu, totalIcu)

  const activeAmbulances = ambulances.filter((a) => a.status !== 'idle').length

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 px-6 py-4 backdrop-blur-md sticky top-0 z-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & Live Status */}
        <div className="flex items-center space-x-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">
                Citywide Command Center
              </h2>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                  isLive
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {isLive ? 'Supabase Live' : 'Demo Preview Mode'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Real-time hospital capacity & emergency dispatch telemetry
            </p>
          </div>
        </div>

        {/* System Summary Metrics */}
        <div className="flex items-center space-x-6 bg-slate-900/80 border border-slate-800/90 rounded-lg px-4 py-2 text-xs font-mono">
          <div>
            <div className="text-slate-400 text-[10px] uppercase tracking-wider">HOSPITALS</div>
            <div className="text-slate-100 font-bold text-sm mt-0.5">{hospitals.length}</div>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <div className="text-slate-400 text-[10px] uppercase tracking-wider">BED OCCUPANCY</div>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span
                className={`font-bold text-sm ${
                  bedStatus === 'critical'
                    ? 'text-rose-400'
                    : bedStatus === 'warning'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {occupiedBeds}/{totalBeds} ({bedPercentage}%)
              </span>
            </div>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <div className="text-slate-400 text-[10px] uppercase tracking-wider">ICU CAPACITY</div>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span
                className={`font-bold text-sm ${
                  icuStatus === 'critical'
                    ? 'text-rose-400'
                    : icuStatus === 'warning'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {occupiedIcu}/{totalIcu} ({icuPercentage}%)
              </span>
            </div>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <div className="text-slate-400 text-[10px] uppercase tracking-wider">DISPATCH FLEET</div>
            <div className="text-slate-100 font-bold text-sm mt-0.5">
              {activeAmbulances}/{ambulances.length} Active
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="text-xs space-x-1"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={onSeed}
            disabled={isSeeding}
            className="text-xs space-x-1.5 bg-slate-100 text-slate-900 hover:bg-slate-200 border-none font-semibold"
          >
            <Database className="h-3.5 w-3.5" />
            <span>{isSeeding ? 'Seeding...' : 'Seed Database'}</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
