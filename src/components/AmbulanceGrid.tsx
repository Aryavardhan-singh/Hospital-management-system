import React from 'react'
import { Ambulance, Hospital } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Truck, MapPin, Building2, Navigation } from 'lucide-react'

interface AmbulanceGridProps {
  ambulances: Ambulance[]
  hospitals: Hospital[]
}

export const AmbulanceGrid: React.FC<AmbulanceGridProps> = ({ ambulances, hospitals }) => {
  if (ambulances.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white">
        <Truck className="h-10 w-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-slate-900 font-extrabold text-base">No Ambulances Dispatched</h3>
        <p className="text-slate-500 text-xs mt-1">
          Click "Seed Database" in the top header to populate emergency units.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {ambulances.map((amb) => {
        const assignedHospital = hospitals.find((h) => h.id === amb.assigned_hospital_id)

        return (
          <Card key={amb.id} className="rounded-[2rem] p-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Truck className="h-4 w-4" />
                  </div>
                  <span>{amb.id}</span>
                </CardTitle>

                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    amb.status === 'occupied'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : amb.status === 'enroute'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {amb.status}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 text-xs font-medium">
              <div className="flex items-center justify-between text-slate-500 pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" /> Location:
                </span>
                <span className="font-mono text-slate-800 font-bold">
                  {amb.lat.toFixed(4)}, {amb.lng.toFixed(4)}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">
                  ASSIGNED HOSPITAL
                </div>
                {assignedHospital ? (
                  <div className="flex items-center space-x-2 text-slate-900 font-extrabold">
                    <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span className="truncate">{assignedHospital.name}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1.5 text-slate-400 italic">
                    <Navigation className="h-3.5 w-3.5" />
                    <span>Unassigned / Staged</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
