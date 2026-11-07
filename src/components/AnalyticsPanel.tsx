import React, { useMemo } from 'react'
import { Activity, Building2, Clock3, Truck } from 'lucide-react'
import { Hospital, Ambulance } from '@/types'
import { distanceKm } from '@/lib/routing'

interface AnalyticsPanelProps {
  hospitals: Hospital[]
  ambulances: Ambulance[]
}

const SIMULATED_VOLUME_PREVIEW = [2, 1, 0, 1, 3, 2, 1, 2, 4, 3, 2, 3, 5, 4, 3, 4, 6, 5, 4, 3, 4, 3, 2, 2]
const ASSUMED_RESPONSE_SPEED_KMH = 40

function percentage(used: number, total: number) {
  return total > 0 ? Math.round((used / total) * 100) : 0
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ hospitals, ambulances }) => {
  const totalBeds = hospitals.reduce((sum, hospital) => sum + hospital.total_beds, 0)
  const occupiedBeds = hospitals.reduce((sum, hospital) => sum + hospital.occupied_beds, 0)
  const totalIcuBeds = hospitals.reduce((sum, hospital) => sum + hospital.icuBedsTotal, 0)
  const occupiedIcuBeds = hospitals.reduce(
    (sum, hospital) => sum + Math.max(0, hospital.icuBedsTotal - hospital.icuBedsAvailable),
    0
  )
  const activeAmbulances = ambulances.filter((ambulance) => ambulance.status !== 'idle').length
  const fleetUtilization = percentage(activeAmbulances, ambulances.length)

  const responseMinutes = useMemo(() => {
    const activeRoutes = ambulances.flatMap((ambulance) => {
      if (ambulance.status !== 'enroute' || !ambulance.assigned_hospital_id) return []
      const hospital = hospitals.find((candidate) => candidate.id === ambulance.assigned_hospital_id)
      if (!hospital) return []
      return [(distanceKm(ambulance.lat, ambulance.lng, hospital.lat, hospital.lng) / ASSUMED_RESPONSE_SPEED_KMH) * 60]
    })
    if (activeRoutes.length === 0) return null
    return activeRoutes.reduce((sum, minutes) => sum + minutes, 0) / activeRoutes.length
  }, [ambulances, hospitals])

  const dispatchVolumes = useMemo(() => {
    const now = new Date()
    const hourlyCounts = Array.from({ length: 24 }, (_, index) => {
      const hourStart = new Date(now.getTime() - (23 - index) * 60 * 60 * 1000)
      hourStart.setMinutes(0, 0, 0)
      const nextHour = new Date(hourStart.getTime() + 60 * 60 * 1000)
      return ambulances.filter((ambulance) => {
        if (!ambulance.created_at) return false
        const createdAt = new Date(ambulance.created_at)
        return createdAt >= hourStart && createdAt < nextHour
      }).length
    })
    const hasRecordedDispatches = ambulances.some((ambulance) => ambulance.created_at)
    return hasRecordedDispatches ? hourlyCounts : SIMULATED_VOLUME_PREVIEW
  }, [ambulances])

  const maxVolume = Math.max(...dispatchVolumes, 1)

  return (
    <div className="space-y-6 font-sans">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Activity className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Response Analytics</h2>
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
          Network capacity, modeled response estimates, and fleet activity
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          icon={<Clock3 className="h-5 w-5" />}
          label="Avg Dispatch-to-Arrival"
          value={responseMinutes === null ? '—' : `${responseMinutes.toFixed(1)} min`}
          detail={
            responseMinutes === null
              ? 'No ambulances currently en route'
              : `Modeled at ${ASSUMED_RESPONSE_SPEED_KMH} km/h`
          }
          color="indigo"
        />
        <MetricCard
          icon={<Building2 className="h-5 w-5" />}
          label="Network Bed Utilization"
          value={`${percentage(occupiedBeds, totalBeds)}%`}
          detail={`${occupiedBeds} of ${totalBeds} beds occupied`}
          color="blue"
        />
        <MetricCard
          icon={<Activity className="h-5 w-5" />}
          label="ICU Utilization"
          value={`${percentage(occupiedIcuBeds, totalIcuBeds)}%`}
          detail={`${occupiedIcuBeds} of ${totalIcuBeds} ICU beds occupied`}
          color="rose"
        />
        <MetricCard
          icon={<Truck className="h-5 w-5" />}
          label="Fleet Utilization"
          value={`${fleetUtilization}%`}
          detail={`${activeAmbulances} active of ${ambulances.length} units`}
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Hospital Occupancy Comparison</h3>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">Occupied general beds by facility</p>
            </div>
            <Building2 className="h-4 w-4 text-indigo-500 shrink-0" />
          </div>
          <div className="space-y-4">
            {hospitals.map((hospital) => {
              const utilization = percentage(hospital.occupied_beds, hospital.total_beds)
              const barColor =
                utilization >= 90 ? 'bg-rose-500' : utilization >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
              return (
                <div key={hospital.id}>
                  <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
                    <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{hospital.name}</span>
                    <span className="font-mono font-extrabold text-slate-800 dark:text-slate-100 shrink-0">{utilization}%</span>
                  </div>
                  <div
                    className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
                    role="meter"
                    aria-label={`${hospital.name} bed utilization`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={utilization}
                  >
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${utilization}%` }} />
                  </div>
                </div>
              )
            })}
            {hospitals.length === 0 && (
              <p className="text-xs text-slate-400 py-8 text-center">No hospital data available.</p>
            )}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">24-Hour Fleet Dispatch Volume</h3>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">
                {ambulances.some((ambulance) => ambulance.created_at)
                  ? 'Recorded ambulance entries by hour'
                  : 'Simulated preview until dispatch timestamps are available'}
              </p>
            </div>
            <Truck className="h-4 w-4 text-indigo-500 shrink-0" />
          </div>
          <div className="h-56 flex items-end gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2" role="img" aria-label="Bar chart showing dispatch volume over the last 24 hours">
            {dispatchVolumes.map((volume, index) => (
              <div key={index} className="h-full flex-1 flex flex-col justify-end items-center gap-1 group">
                <span className="text-[9px] text-slate-400 opacity-0 group-hover:opacity-100">{volume}</span>
                <div
                  className={`w-full max-w-5 rounded-t-md transition-all ${
                    volume > 0 ? 'bg-indigo-500 group-hover:bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                  style={{ height: `${Math.max(4, (volume / maxVolume) * 85)}%` }}
                  title={`${volume} dispatch${volume === 1 ? '' : 'es'}`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2">
            <span>24h ago</span>
            <span>18h</span>
            <span>12h</span>
            <span>6h</span>
            <span>Now</span>
          </div>
        </section>
      </div>
    </div>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
  color: 'indigo' | 'blue' | 'rose' | 'emerald'
}

const METRIC_COLORS: Record<MetricCardProps['color'], string> = {
  indigo: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50',
  blue: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50',
  rose: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50',
  emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, detail, color }) => (
  <section className="bg-white dark:bg-slate-900 rounded-[1.75rem] p-5 border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none">
    <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${METRIC_COLORS[color]}`}>
      {icon}
    </div>
    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mt-4">{label}</p>
    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{value}</p>
    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">{detail}</p>
  </section>
)
