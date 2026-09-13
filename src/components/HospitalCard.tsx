import React, { useEffect, useState, useRef } from 'react'
import { Hospital } from '@/types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Activity, HeartPulse, UserPlus, Stethoscope, MapPin } from 'lucide-react'

interface HospitalCardProps {
  hospital: Hospital
  onSimulateAdmission: (hospitalId: string) => void
  isUpdating?: boolean
}

export const HospitalCard: React.FC<HospitalCardProps> = ({
  hospital,
  onSimulateAdmission,
  isUpdating = false,
}) => {
  const occupancyRate = hospital.total_beds > 0
    ? (hospital.occupied_beds / hospital.total_beds) * 100
    : 0

  const icuOccupancyRate = hospital.icu_beds > 0
    ? (hospital.icu_occupied / hospital.icu_beds) * 100
    : 0

  // Status Dot & Badge calculation:
  // Green if < 70%, Yellow if 70-90%, Red if > 90%
  let statusColor = 'bg-emerald-500'
  let statusText = 'NORMAL'
  let badgeVariant: 'good' | 'warning' | 'critical' = 'good'

  if (occupancyRate > 90) {
    statusColor = 'bg-rose-500 animate-pulse'
    statusText = 'CRITICAL (>90%)'
    badgeVariant = 'critical'
  } else if (occupancyRate >= 70) {
    statusColor = 'bg-amber-500'
    statusText = 'BUSY (70-90%)'
    badgeVariant = 'warning'
  }

  // Detect bed count changes to trigger pulse animation
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
    <Card className="bg-slate-900/90 border-slate-800/90 hover:border-slate-700/80 transition-all duration-300 relative overflow-hidden flex flex-col justify-between shadow-lg">
      {/* Top Status Accent Bar */}
      <div
        className={`h-1.5 w-full ${
          occupancyRate > 90
            ? 'bg-rose-500'
            : occupancyRate >= 70
            ? 'bg-amber-500'
            : 'bg-emerald-500'
        }`}
      />

      <div>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColor}`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${statusColor}`}
                  />
                </span>
                <span className="truncate">{hospital.name}</span>
              </CardTitle>

              <CardDescription className="flex items-center gap-1 mt-1 text-[11px] text-slate-400 font-mono">
                <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                <span>
                  {hospital.lat.toFixed(4)}, {hospital.lng.toFixed(4)}
                </span>
              </CardDescription>
            </div>

            <Badge variant={badgeVariant} className="shrink-0 text-[10px]">
              {statusText}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* General Beds Metric (Large Numbers) */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 font-sans mb-1">
              <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Activity className="h-3.5 w-3.5 text-slate-400" />
                General Bed Occupancy
              </span>
              <span className="font-mono text-[11px] font-bold text-slate-300">
                {Math.round(occupancyRate)}%
              </span>
            </div>

            <div className="flex items-baseline space-x-1.5 mt-1 font-mono">
              <span
                className={`text-2xl lg:text-3xl font-extrabold text-slate-100 transition-all ${
                  pulse ? 'animate-number-pulse text-sky-400' : ''
                }`}
              >
                {hospital.occupied_beds}
              </span>
              <span className="text-lg font-bold text-slate-500">/</span>
              <span className="text-lg font-bold text-slate-400">{hospital.total_beds}</span>
              <span className="text-xs text-slate-500 font-sans ml-1">beds</span>
            </div>

            {/* General Bed Progress Bar */}
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 mt-2.5">
              <div
                className={`h-full transition-all duration-500 ${
                  occupancyRate > 90
                    ? 'bg-rose-500'
                    : occupancyRate >= 70
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, occupancyRate)}%` }}
              />
            </div>
          </div>

          {/* ICU Bed Metric */}
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/50">
            <div className="flex items-center justify-between text-xs text-slate-400 font-sans mb-1">
              <span className="flex items-center gap-1.5 text-slate-300 font-medium text-[11px]">
                <HeartPulse className="h-3.5 w-3.5 text-rose-400" />
                ICU Capacity
              </span>
              <span className="font-mono text-[11px] font-bold text-slate-300">
                {Math.round(icuOccupancyRate)}%
              </span>
            </div>

            <div className="flex items-baseline space-x-1.5 font-mono">
              <span className="text-lg font-bold text-slate-200">{hospital.icu_occupied}</span>
              <span className="text-sm font-bold text-slate-500">/</span>
              <span className="text-sm font-bold text-slate-400">{hospital.icu_beds}</span>
              <span className="text-[11px] text-slate-500 font-sans ml-1">ICU beds</span>
            </div>

            {/* ICU Progress Bar */}
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 mt-2">
              <div
                className={`h-full transition-all duration-500 ${
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

          {/* Specialty Pill Badges */}
          <div>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Stethoscope className="h-3 w-3 text-slate-500" /> Specialties
            </div>
            <div className="flex flex-wrap gap-1">
              {hospital.specialties.map((spec, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-[10px] font-sans font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </div>

      {/* Card Footer: Dev Test Action Button */}
      <CardFooter className="pt-3 border-t border-slate-800/60">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSimulateAdmission(hospital.id)}
          disabled={isUpdating || hospital.occupied_beds >= hospital.total_beds}
          className="w-full h-8 text-xs font-mono border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-700 hover:text-white space-x-1.5 transition-all active:scale-[0.98]"
        >
          <UserPlus className="h-3.5 w-3.5 text-sky-400" />
          <span>Simulate Admission (+1 Bed)</span>
        </Button>
      </CardFooter>
    </Card>
  )
}
