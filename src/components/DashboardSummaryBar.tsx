import React from 'react'
import { Hospital } from '@/types'
import { Building2, BedDouble, AlertTriangle, Radio } from 'lucide-react'

interface DashboardSummaryBarProps {
  hospitals: Hospital[]
  isLive: boolean
}

export const DashboardSummaryBar: React.FC<DashboardSummaryBarProps> = ({
  hospitals,
  isLive,
}) => {
  const totalHospitals = hospitals.length

  const totalBeds = hospitals.reduce((acc, h) => acc + h.total_beds, 0)
  const totalOccupied = hospitals.reduce((acc, h) => acc + h.occupied_beds, 0)
  const totalAvailableBeds = Math.max(0, totalBeds - totalOccupied)

  // Red Alert count: hospitals with > 90% capacity
  const redAlertCount = hospitals.filter((h) => {
    if (h.total_beds <= 0) return false
    return (h.occupied_beds / h.total_beds) * 100 > 90
  }).length

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 md:p-5 shadow-lg backdrop-blur-md">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-800">
        {/* Metric 1: Total Hospitals */}
        <div className="flex items-center space-x-3.5 pr-4">
          <div className="h-10 w-10 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-100 shrink-0">
            <Building2 className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              TOTAL HOSPITALS
            </div>
            <div className="text-xl font-bold font-mono text-slate-100 mt-0.5">
              {totalHospitals}
            </div>
          </div>
        </div>

        {/* Metric 2: Total Available Beds */}
        <div className="flex items-center space-x-3.5 pt-3 md:pt-0 md:px-4">
          <div className="h-10 w-10 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-100 shrink-0">
            <BedDouble className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              CITYWIDE AVAILABLE BEDS
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
              {totalAvailableBeds} <span className="text-xs font-normal text-slate-400">/ {totalBeds} total</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Hospitals at >90% Capacity (Red Alert Count) */}
        <div className="flex items-center space-x-3.5 pt-3 md:pt-0 md:px-4">
          <div
            className={`h-10 w-10 rounded-lg border flex items-center justify-center shrink-0 ${
              redAlertCount > 0
                ? 'bg-rose-950/80 border-rose-800 text-rose-400 animate-pulse'
                : 'bg-slate-800 border-slate-700/80 text-slate-400'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              RED ALERT FACILITIES (&gt;90%)
            </div>
            <div
              className={`text-xl font-bold font-mono mt-0.5 ${
                redAlertCount > 0 ? 'text-rose-400' : 'text-slate-100'
              }`}
            >
              {redAlertCount} <span className="text-xs font-normal text-slate-400">facilities</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Realtime Connection Signal */}
        <div className="flex items-center justify-between pt-3 md:pt-0 md:pl-4">
          <div className="flex items-center space-x-3">
            <div
              className={`h-10 w-10 rounded-lg border flex items-center justify-center shrink-0 ${
                isLive
                  ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-400'
                  : 'bg-amber-950/60 border-amber-800/80 text-amber-400'
              }`}
            >
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                REALTIME STATUS
              </div>
              <div
                className={`text-xs font-bold font-mono uppercase mt-0.5 ${
                  isLive ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {isLive ? 'SUPABASE REALTIME ACTIVE' : 'PREVIEW MODE'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
