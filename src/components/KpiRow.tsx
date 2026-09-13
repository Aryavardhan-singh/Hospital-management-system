import React from 'react'
import { Building2, Activity, HeartPulse, Truck, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { Hospital, Ambulance, getCapacityLevel } from '@/types'

interface KpiRowProps {
  hospitals: Hospital[]
  ambulances: Ambulance[]
}

export const KpiRow: React.FC<KpiRowProps> = ({ hospitals, ambulances }) => {
  const totalBeds = hospitals.reduce((acc, h) => acc + h.total_beds, 0)
  const occupiedBeds = hospitals.reduce((acc, h) => acc + h.occupied_beds, 0)
  const totalIcu = hospitals.reduce((acc, h) => acc + h.icu_beds, 0)
  const occupiedIcu = hospitals.reduce((acc, h) => acc + h.icu_occupied, 0)

  const bedPercentage = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
  const icuPercentage = totalIcu > 0 ? Math.round((occupiedIcu / totalIcu) * 100) : 0
  const activeAmbulances = ambulances.filter((a) => a.status !== 'idle').length

  const bedStatus = getCapacityLevel(occupiedBeds, totalBeds)
  const icuStatus = getCapacityLevel(occupiedIcu, totalIcu)

  const kpis = [
    {
      label: 'TOTAL HOSPITALS',
      value: hospitals.length.toString(),
      subtext: 'Operational Units',
      change: '+12%',
      isPositive: true,
      icon: Building2,
      boxBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      sparklineColor: '#4f46e5',
      sparklinePath: 'M0,25 Q15,10 30,20 T60,5 T90,22 T120,10',
    },
    {
      label: 'GENERAL BED OCCUPANCY',
      value: `${bedPercentage}%`,
      subtext: `${occupiedBeds} / ${totalBeds} Beds`,
      change: bedPercentage > 80 ? '+6.4%' : '-2.1%',
      isPositive: bedPercentage <= 80,
      icon: Activity,
      boxBg: bedStatus === 'critical' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100',
      sparklineColor: bedStatus === 'critical' ? '#f43f5e' : '#10b981',
      sparklinePath: 'M0,28 Q20,20 40,30 T80,10 T120,18',
    },
    {
      label: 'CRITICAL ICU CAPACITY',
      value: `${icuPercentage}%`,
      subtext: `${occupiedIcu} / ${totalIcu} ICU Beds`,
      change: icuPercentage > 85 ? '+8.9%' : '+1.2%',
      isPositive: false,
      icon: HeartPulse,
      boxBg: icuStatus === 'critical' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100',
      sparklineColor: icuStatus === 'critical' ? '#f43f5e' : '#f59e0b',
      sparklinePath: 'M0,15 Q25,30 50,12 T90,25 T120,5',
    },
    {
      label: 'ACTIVE DISPATCH FLEET',
      value: `${activeAmbulances}/${ambulances.length}`,
      subtext: 'Emergency Response Units',
      change: '+4 active',
      isPositive: true,
      icon: Truck,
      boxBg: 'bg-blue-50 text-blue-600 border-blue-100',
      sparklineColor: '#3b82f6',
      sparklinePath: 'M0,30 Q20,15 40,25 T80,12 T120,20',
    },
    {
      label: 'AVG DISPATCH TIME',
      value: '6.4 min',
      subtext: 'Target < 8.0 min',
      change: '-0.8 min',
      isPositive: true,
      icon: Clock,
      boxBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      sparklineColor: '#10b981',
      sparklinePath: 'M0,10 Q20,22 40,15 T80,28 T120,12',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon
        return (
          <div
            key={index}
            className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_30px_-6px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between group"
          >
            <div>
              {/* Header: Icon & Change Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className={`h-11 w-11 rounded-2xl ${kpi.boxBg} border flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                  <Icon className="h-5 w-5" />
                </div>

                <div
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                    kpi.isPositive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                  }`}
                >
                  {kpi.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{kpi.change}</span>
                </div>
              </div>

              {/* Label & Value */}
              <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                {kpi.label}
              </div>
              <div className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight mt-1">
                {kpi.value}
              </div>
              <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                {kpi.subtext}
              </div>
            </div>

            {/* Bottom Sparkline SVG Graph */}
            <div className="mt-4 pt-2 border-t border-slate-50 flex items-center justify-between">
              <svg className="w-full h-8 overflow-visible" viewBox="0 0 120 35">
                <path
                  d={kpi.sparklinePath}
                  fill="none"
                  stroke={kpi.sparklineColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        )
      })}
    </div>
  )
}
