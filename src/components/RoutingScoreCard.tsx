import React from 'react'
import { ScoreBreakdown } from '@/lib/routing'
import { MapPin, Activity, Stethoscope, Navigation, TrendingDown } from 'lucide-react'

interface RoutingScoreCardProps {
  hospitalName: string
  breakdown: ScoreBreakdown
  requiredSpecialty?: string | null
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  )
}

function ScoreRow({
  icon,
  label,
  value,
  detail,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  detail: string
  color: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 font-bold text-slate-600">
          {icon}
          {label}
        </span>
        <span className="font-extrabold text-slate-800 font-mono">{detail}</span>
      </div>
      <ScoreBar value={value} color={color} />
    </div>
  )
}

export const RoutingScoreCard: React.FC<RoutingScoreCardProps> = ({
  hospitalName,
  breakdown,
  requiredSpecialty,
}) => {
  const totalPct = Math.round(breakdown.total * 100)

  const totalColor =
    totalPct >= 70
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : totalPct >= 45
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-rose-700 bg-rose-50 border-rose-200'

  return (
    <div className="mt-3 p-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider">
            Why This Hospital?
          </p>
          <p className="text-xs font-extrabold text-slate-900 mt-0.5 truncate">{hospitalName}</p>
        </div>
        <span
          className={`px-2.5 py-1 rounded-xl border text-xs font-black font-mono ${totalColor}`}
        >
          {totalPct}%
        </span>
      </div>

      {/* Score rows */}
      <div className="space-y-2.5">
        <ScoreRow
          icon={<MapPin className="h-3 w-3 text-indigo-500" />}
          label="Distance"
          value={breakdown.distanceScore}
          detail={`${breakdown.distanceKm.toFixed(1)} km`}
          color="bg-indigo-500"
        />
        <ScoreRow
          icon={<Activity className="h-3 w-3 text-emerald-500" />}
          label="Capacity"
          value={breakdown.capacityScore}
          detail={`${Math.round(breakdown.capacityPct)}% full`}
          color={breakdown.capacityPct > 90 ? 'bg-rose-500' : breakdown.capacityPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}
        />
        <ScoreRow
          icon={<Stethoscope className="h-3 w-3 text-violet-500" />}
          label="Specialty"
          value={breakdown.specialtyScore}
          detail={
            requiredSpecialty
              ? breakdown.specialtyMatched
                ? '✓ Matched'
                : '✗ Not matched'
              : 'N/A'
          }
          color={breakdown.specialtyMatched ? 'bg-violet-500' : 'bg-slate-300'}
        />
        <ScoreRow
          icon={<Navigation className="h-3 w-3 text-blue-500" />}
          label="Traffic"
          value={breakdown.trafficScore}
          detail={`${breakdown.trafficMultiplier.toFixed(2)}× congestion`}
          color={breakdown.trafficMultiplier > 1.2 ? 'bg-rose-400' : 'bg-blue-500'}
        />
      </div>

      {/* Footer note */}
      <div className="flex items-center gap-1.5 text-[10px] text-indigo-500 font-bold pt-1 border-t border-indigo-100">
        <TrendingDown className="h-3 w-3" />
        Weighted: 40% distance · 35% capacity · 15% specialty · 10% traffic
      </div>
    </div>
  )
}
