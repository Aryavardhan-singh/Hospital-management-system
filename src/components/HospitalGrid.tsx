import React from 'react'
import { Hospital, getCapacityLevel } from '@/types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
import { Building2, MapPin, Activity, Plus, Minus, Stethoscope, HeartPulse } from 'lucide-react'
import { Button } from './ui/button'

interface HospitalGridProps {
  hospitals: Hospital[]
  searchTerm?: string
  onUpdateOccupancy?: (id: string, delta: number) => void
}

export const HospitalGrid: React.FC<HospitalGridProps> = ({
  hospitals,
  searchTerm = '',
  onUpdateOccupancy,
}) => {
  const filtered = hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.specialties.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (filtered.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white">
        <Building2 className="h-10 w-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-slate-900 font-extrabold text-base">No Hospitals Match Query</h3>
        <p className="text-slate-500 text-xs mt-1">
          Try searching for another facility or specialty name.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filtered.map((hospital) => {
        const bedPercentage = Math.round((hospital.occupied_beds / hospital.total_beds) * 100)
        const icuPercentage = Math.round((hospital.icu_occupied / hospital.icu_beds) * 100)

        const bedStatus = getCapacityLevel(hospital.occupied_beds, hospital.total_beds)
        const icuStatus = getCapacityLevel(hospital.icu_occupied, hospital.icu_beds)

        return (
          <Card key={hospital.id} className="relative overflow-hidden group rounded-[2rem]">
            {/* Top Indicator Accent */}
            <div
              className={`h-1.5 w-full ${
                bedStatus === 'critical'
                  ? 'bg-rose-500'
                  : bedStatus === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
            />

            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>{hospital.name}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center space-x-1 mt-1 text-xs">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {hospital.lat.toFixed(4)}, {hospital.lng.toFixed(4)}
                    </span>
                  </CardDescription>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    bedStatus === 'critical'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : bedStatus === 'warning'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {bedStatus === 'critical' ? 'CRITICAL' : bedStatus === 'warning' ? 'HIGH CAP' : 'GOOD'}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* General Beds Metric & Bar */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-indigo-600" /> General Beds
                  </span>
                  <span className="font-extrabold text-slate-900">
                    {hospital.occupied_beds} / {hospital.total_beds} ({bedPercentage}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      bedStatus === 'critical'
                        ? 'bg-rose-500'
                        : bedStatus === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, bedPercentage)}%` }}
                  />
                </div>
              </div>

              {/* ICU Beds Metric & Bar */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1">
                    <HeartPulse className="h-3.5 w-3.5 text-rose-500" /> ICU Capacity
                  </span>
                  <span className="font-extrabold text-slate-900">
                    {hospital.icu_occupied} / {hospital.icu_beds} ({icuPercentage}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      icuStatus === 'critical'
                        ? 'bg-rose-500'
                        : icuStatus === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, icuPercentage)}%` }}
                  />
                </div>
              </div>

              {/* Specialties Tag Cloud */}
              <div>
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

              {/* Live Test Controls */}
              {onUpdateOccupancy && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Test Realtime Update:</span>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateOccupancy(hospital.id, -1)}
                      className="h-7 w-7 p-0 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100"
                      title="Free 1 Bed"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateOccupancy(hospital.id, 1)}
                      className="h-7 w-7 p-0 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100"
                      title="Occupy 1 Bed"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
