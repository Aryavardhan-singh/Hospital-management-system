import React from 'react'
import { Hospital, getCapacityLevel } from '@/types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Building2, MapPin, Activity, Plus, Minus, Stethoscope } from 'lucide-react'

interface HospitalListProps {
  hospitals: Hospital[]
  onUpdateOccupancy?: (id: string, delta: number) => void
}

export const HospitalList: React.FC<HospitalListProps> = ({
  hospitals,
  onUpdateOccupancy,
}) => {
  if (hospitals.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-slate-800 rounded-lg bg-slate-900/30">
        <Building2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
        <h3 className="text-slate-300 font-medium">No Hospitals Configured</h3>
        <p className="text-slate-500 text-xs mt-1">
          Click "Seed Database" in the top bar or run the `schema.sql` script in Supabase.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {hospitals.map((hospital) => {
        const bedPercentage = Math.round((hospital.occupied_beds / hospital.total_beds) * 100)
        const icuPercentage = Math.round((hospital.icu_occupied / hospital.icu_beds) * 100)

        const bedStatus = getCapacityLevel(hospital.occupied_beds, hospital.total_beds)
        const icuStatus = getCapacityLevel(hospital.icu_occupied, hospital.icu_beds)

        return (
          <Card key={hospital.id} className="relative overflow-hidden group">
            {/* Top Status Bar Indicator Accent */}
            <div
              className={`h-1 w-full ${
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
                  <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{hospital.name}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center space-x-1 mt-1 text-[11px]">
                    <MapPin className="h-3 w-3 text-slate-500" />
                    <span>
                      {hospital.lat.toFixed(4)}, {hospital.lng.toFixed(4)}
                    </span>
                  </CardDescription>
                </div>
                <Badge variant={bedStatus}>
                  {bedStatus === 'critical'
                    ? 'FULL'
                    : bedStatus === 'warning'
                    ? 'HIGH CAP'
                    : 'AVAILABLE'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 text-xs font-mono">
              {/* General Beds Metric & Bar */}
              <div>
                <div className="flex justify-between items-center mb-1 text-slate-300">
                  <span className="text-[11px] text-slate-400 font-sans">General Beds Occupancy</span>
                  <span className="font-bold">
                    {hospital.occupied_beds} / {hospital.total_beds} ({bedPercentage}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
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
                <div className="flex justify-between items-center mb-1 text-slate-300">
                  <span className="text-[11px] text-slate-400 font-sans flex items-center gap-1">
                    <Activity className="h-3 w-3 text-rose-400" /> ICU Capacity
                  </span>
                  <span className="font-bold">
                    {hospital.icu_occupied} / {hospital.icu_beds} ({icuPercentage}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
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
                <div className="text-[10px] text-slate-500 font-sans uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Stethoscope className="h-3 w-3 text-slate-500" /> Specialties
                </div>
                <div className="flex flex-wrap gap-1">
                  {hospital.specialties.map((spec, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-800/80 text-slate-300 border border-slate-700/50 font-sans"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Live Test Controls (Simulate Real-time Updates) */}
              {onUpdateOccupancy && (
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between font-sans text-slate-400 text-[11px]">
                  <span>Test Realtime Update:</span>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateOccupancy(hospital.id, -1)}
                      className="h-6 w-6 p-0 text-slate-300 hover:text-white"
                      title="Admit / Free 1 Bed"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateOccupancy(hospital.id, 1)}
                      className="h-6 w-6 p-0 text-slate-300 hover:text-white"
                      title="Occupy 1 Bed"
                    >
                      <Plus className="h-3 w-3" />
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
