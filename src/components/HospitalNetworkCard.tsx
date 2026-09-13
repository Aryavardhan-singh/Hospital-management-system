import React, { useState, useEffect, useRef } from 'react'
import { Hospital } from '@/types'
import { Building2, MapPin, Activity, HeartPulse, Stethoscope, Radio, ChevronRight } from 'lucide-react'

interface HospitalNetworkCardProps {
  hospital: Hospital
  isLive: boolean
  onClick: () => void
}

export const HospitalNetworkCard: React.FC<HospitalNetworkCardProps> = ({
  hospital,
  isLive,
  onClick,
}) => {
  const occupancyRate = hospital.total_beds > 0
    ? (hospital.occupied_beds / hospital.total_beds) * 100
    : 0

  const icuOccupancyRate = hospital.icu_beds > 0
    ? (hospital.icu_occupied / hospital.icu_beds) * 100
    : 0

  // Status pill badge calculation:
  // Green if < 70%, Yellow if 70-90%, Red if > 90%
  let statusBadgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200'
  let statusText = 'NORMAL'
  let barColor = 'bg-emerald-500'

  if (occupancyRate > 90) {
    statusBadgeBg = 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
    statusText = 'CRITICAL'
    barColor = 'bg-rose-500'
  } else if (occupancyRate >= 70) {
    statusBadgeBg = 'bg-amber-50 text-amber-700 border-amber-200'
    statusText = 'HIGH CAP'
    barColor = 'bg-amber-500'
  }

  // Detect bed count change for real-time pulse glow
  const [pulse, setPulse] = useState(false)
  const prevBedsRef = useRef(hospital.occupied_beds)

  useEffect(() => {
    if (prevBedsRef.current !== hospital.occupied_beds) {
      setPulse(true)
      const timer = setTimeout(() => setPulse(false), 900)
      prevBedsRef.current = hospital.occupied_beds
      return () => clearTimeout(timer)
    }
  }, [hospital.occupied_beds])

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_30px_-6px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
    >
      {/* Top Accent Indicator Bar */}
      <div className={`h-1.5 w-full absolute top-0 left-0 right-0 ${barColor}`} />

      <div>
        {/* Card Header: Hospital Name & Status Badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
              <Building2 className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
              <span className="truncate">{hospital.name}</span>
            </h3>

            <p className="flex items-center space-x-1 text-xs font-semibold text-slate-400 mt-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>
                {hospital.lat.toFixed(4)}, {hospital.lng.toFixed(4)}
              </span>
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Live Connection Icon */}
            <div className="h-6 w-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400" title={isLive ? "Supabase Live Subscribed" : "Preview Mode"}>
              <Radio className={`h-3 w-3 ${isLive ? 'text-emerald-500' : 'text-amber-500'}`} />
            </div>

            <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider border ${statusBadgeBg}`}>
              {statusText}
            </span>
          </div>
        </div>

        {/* Capacity Metrics */}
        <div className="space-y-3.5 my-4">
          {/* General Beds Metric */}
          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-1">
              <span className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-indigo-600" /> General Beds
              </span>
              <span className={`font-black font-mono transition-colors ${pulse ? 'text-indigo-600 scale-105' : 'text-slate-900'}`}>
                {hospital.occupied_beds} / {hospital.total_beds} ({Math.round(occupancyRate)}%)
              </span>
            </div>
            <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${Math.min(100, occupancyRate)}%` }}
              />
            </div>
          </div>

          {/* ICU Beds Metric */}
          <div className="p-3 rounded-2xl bg-slate-50/50 border border-slate-100">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-1">
              <span className="flex items-center gap-1.5 text-[11px]">
                <HeartPulse className="h-3.5 w-3.5 text-rose-500" /> ICU Capacity
              </span>
              <span className="font-extrabold font-mono text-slate-900">
                {hospital.icu_occupied} / {hospital.icu_beds} ({Math.round(icuOccupancyRate)}%)
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  icuOccupancyRate > 90
                    ? 'bg-rose-500'
                    : icuOccupancyRate >= 70
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, icuOccupancyRate)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Specialty Pill Badges */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-2 flex items-center gap-1">
            <Stethoscope className="h-3 w-3 text-slate-400" /> SPECIALTIES
          </div>
          <div className="flex flex-wrap gap-1.5">
            {hospital.specialties.map((spec, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Card Action Link */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-indigo-600 group-hover:translate-x-1 transition-transform">
        <span>View Full Breakdown & Manage</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </div>
  )
}
