import React from 'react'
import { Hospital, Ambulance, getCapacityLevel } from '@/types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
import { Building2, Activity, HeartPulse, Clock, ArrowUpRight, AlertTriangle, ShieldCheck } from 'lucide-react'

interface AnalyticsGridProps {
  hospitals: Hospital[]
  ambulances: Ambulance[]
}

export const AnalyticsGrid: React.FC<AnalyticsGridProps> = ({ hospitals, ambulances }) => {
  const sortedByCapacity = [...hospitals].sort(
    (a, b) => b.occupied_beds / b.total_beds - a.occupied_beds / a.total_beds
  )

  const criticalHospitals = sortedByCapacity.slice(0, 4)

  return (
    <div className="space-y-6">
      {/* Top 12-Column Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* (6-col) Monthly Occupancy Trend SVG Area Graph */}
        <Card className="lg:col-span-6 rounded-[2.5rem] p-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-extrabold text-slate-900">
                Citywide Occupancy Trends
              </CardTitle>
              <CardDescription>
                Real-time bed & ICU utilization telemetry (Last 24 Hours)
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-2xl text-[11px] font-bold">
              <span className="px-3 py-1 bg-white text-indigo-600 rounded-xl shadow-xs">Beds</span>
              <span className="px-3 py-1 text-slate-500 hover:text-slate-900">ICU</span>
            </div>
          </CardHeader>

          <CardContent>
            <div className="h-[220px] w-full pt-4 relative flex items-end">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                <div className="border-b border-dashed border-slate-200 w-full" />
                <div className="border-b border-dashed border-slate-200 w-full" />
                <div className="border-b border-dashed border-slate-200 w-full" />
                <div className="border-b border-dashed border-slate-200 w-full" />
              </div>

              {/* Area SVG */}
              <svg className="w-full h-full overflow-visible relative z-10" viewBox="0 0 500 180">
                <defs>
                  <linearGradient id="indigoGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Area Fill */}
                <path
                  d="M0,140 Q75,60 150,110 T300,40 T450,90 T500,60 L500,180 L0,180 Z"
                  fill="url(#indigoGradient)"
                />

                {/* Stroke Path */}
                <path
                  d="M0,140 Q75,60 150,110 T300,40 T450,90 T500,60"
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Data Points */}
                <circle cx="150" cy="110" r="5" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
                <circle cx="300" cy="40" r="6" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                <circle cx="450" cy="90" r="5" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
              </svg>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pt-2 border-t border-slate-100">
              <span>00:00</span>
              <span>04:00</span>
              <span>08:00</span>
              <span>12:00</span>
              <span>16:00</span>
              <span>20:00</span>
              <span>NOW</span>
            </div>
          </CardContent>
        </Card>

        {/* (3-col) ICU Specialty Distribution Donut Chart */}
        <Card className="lg:col-span-3 rounded-[2.5rem] p-2 flex flex-col justify-between">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-extrabold text-slate-900">
              ICU Distribution
            </CardTitle>
            <CardDescription>Capacity by Specialty</CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col items-center justify-center my-2">
            {/* SVG Donut Chart */}
            <div className="relative h-36 w-36 flex items-center justify-center">
              <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                {/* Segment 1: Trauma */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="10"
                  strokeDasharray="238"
                  strokeDashoffset="70"
                  strokeLinecap="round"
                />
                {/* Segment 2: Cardiology */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="10"
                  strokeDasharray="238"
                  strokeDashoffset="160"
                  strokeLinecap="round"
                />
                {/* Segment 3: Pediatrics */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="10"
                  strokeDasharray="238"
                  strokeDashoffset="210"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-900 leading-none">78%</span>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">
                  TOTAL ICU
                </span>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="w-full space-y-2 mt-4 text-xs font-bold">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                  <span className="text-slate-600">Trauma Level 1</span>
                </div>
                <span className="text-slate-900 font-extrabold">42%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">Cardiology</span>
                </div>
                <span className="text-slate-900 font-extrabold">26%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="text-slate-600">Pediatric ER</span>
                </div>
                <span className="text-slate-900 font-extrabold">10%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* (3-col) Critical Capacity Hospitals */}
        <Card className="lg:col-span-3 rounded-[2.5rem] p-2 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-extrabold text-slate-900 flex items-center justify-between">
              <span>Capacity Alerts</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </CardTitle>
            <CardDescription>Highest Occupancy Facilities</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {criticalHospitals.map((hospital, idx) => {
              const bedPct = Math.round((hospital.occupied_beds / hospital.total_beds) * 100)
              const level = getCapacityLevel(hospital.occupied_beds, hospital.total_beds)

              return (
                <div
                  key={hospital.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                        level === 'critical'
                          ? 'bg-rose-100 text-rose-700'
                          : level === 'warning'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold text-slate-900 truncate">
                        {hospital.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        {hospital.occupied_beds}/{hospital.total_beds} Beds
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-black shrink-0 ${
                      level === 'critical'
                        ? 'bg-rose-500 text-white'
                        : level === 'warning'
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-500 text-white'
                    }`}
                  >
                    {bedPct}%
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Bottom 12-Column Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* (4-col) Real-time Emergency Dispatch Timeline */}
        <Card className="lg:col-span-4 rounded-[2.5rem] p-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-extrabold text-slate-900 flex items-center justify-between">
              <span>Recent Dispatches</span>
              <Clock className="h-4 w-4 text-indigo-600" />
            </CardTitle>
            <CardDescription>Live Emergency Telemetry Feed</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="relative pl-5 border-l-2 border-slate-100 space-y-4">
              {ambulances.map((amb, i) => (
                <div key={amb.id} className="relative group">
                  {/* Timeline Dot */}
                  <span
                    className={`absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-xs ${
                      amb.status === 'occupied'
                        ? 'bg-rose-500'
                        : amb.status === 'enroute'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-900">{amb.id}</span>
                    <span className="text-[10px] font-bold text-slate-400">{i * 3 + 2}m ago</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Status:{' '}
                    <span className="font-extrabold text-slate-800 uppercase">{amb.status}</span>
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* (8-col) Hospital Beds Breakdown Matrix */}
        <Card className="lg:col-span-8 rounded-[2.5rem] p-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-extrabold text-slate-900">
                Hospital Capacity Matrix
              </CardTitle>
              <CardDescription>Detailed occupancy vs total bed availability</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {hospitals.slice(0, 5).map((h) => {
                const bedPct = Math.round((h.occupied_beds / h.total_beds) * 100)
                const level = getCapacityLevel(h.occupied_beds, h.total_beds)

                return (
                  <div key={h.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1.5">
                      <span className="truncate">{h.name}</span>
                      <span className="font-extrabold">
                        {h.occupied_beds} / {h.total_beds} ({bedPct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          level === 'critical'
                            ? 'bg-rose-500'
                            : level === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, bedPct)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
