import React from 'react'
import { Ambulance, Hospital } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Truck, MapPin, Building2, Navigation } from 'lucide-react'

interface AmbulanceListProps {
  ambulances: Ambulance[]
  hospitals: Hospital[]
}

export const AmbulanceList: React.FC<AmbulanceListProps> = ({
  ambulances,
  hospitals,
}) => {
  if (ambulances.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-slate-800 rounded-lg bg-slate-900/30">
        <Truck className="h-10 w-10 text-slate-600 mx-auto mb-3" />
        <h3 className="text-slate-300 font-medium">No Ambulances Dispatched</h3>
        <p className="text-slate-500 text-xs mt-1">
          Click "Seed Database" in the top bar to populate emergency units.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {ambulances.map((ambulance) => {
        const assignedHospital = hospitals.find(
          (h) => h.id === ambulance.assigned_hospital_id
        )

        return (
          <Card key={ambulance.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-slate-400" />
                  <span>{ambulance.id}</span>
                </CardTitle>

                <Badge
                  variant={
                    ambulance.status === 'occupied'
                      ? 'critical'
                      : ambulance.status === 'enroute'
                      ? 'warning'
                      : 'good'
                  }
                >
                  {ambulance.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1 font-sans text-[11px]">
                  <MapPin className="h-3 w-3 text-slate-500" /> Location:
                </span>
                <span>
                  {ambulance.lat.toFixed(4)}, {ambulance.lng.toFixed(4)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800/60">
                <div className="text-[10px] text-slate-500 font-sans uppercase tracking-wider mb-1">
                  ASSIGNED DESTINATION
                </div>
                {assignedHospital ? (
                  <div className="flex items-center space-x-1.5 text-slate-200 font-sans">
                    <Building2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate font-medium">{assignedHospital.name}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1.5 text-slate-500 font-sans italic">
                    <Navigation className="h-3.5 w-3.5" />
                    <span>Unassigned / Staged at Base</span>
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
