import React from 'react'
import { Activity, Building2, UserMinus, UserPlus } from 'lucide-react'
import { Hospital } from '@/types'

interface HospitalBedAdjustmentPanelProps {
  hospitals: Hospital[]
  onAdjust: (hospitalId: string, delta: number) => void
}

export const HospitalBedAdjustmentPanel: React.FC<HospitalBedAdjustmentPanelProps> = ({
  hospitals,
  onAdjust,
}) => (
  <div className="space-y-6 font-sans">
    <div>
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
          <Building2 className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Hospital Bed Adjustments</h2>
      </div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
        Update occupied general bed counts for your network.
      </p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {hospitals.map((hospital) => {
        const available = Math.max(0, hospital.total_beds - hospital.occupied_beds)
        return (
          <section
            key={hospital.id}
            className="bg-white dark:bg-slate-900 rounded-[1.75rem] p-5 border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{hospital.name}</h3>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">
                  <Activity className="h-3.5 w-3.5 text-indigo-500" />
                  {available} available · {hospital.occupied_beds}/{hospital.total_beds} occupied
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 text-[10px] font-extrabold uppercase">
                ER Staff
              </span>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                disabled={hospital.occupied_beds <= 0}
                onClick={() => onAdjust(hospital.id, -1)}
                className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-slate-200 text-slate-700 text-xs font-extrabold hover:bg-slate-50 disabled:opacity-40"
              >
                <UserMinus className="h-4 w-4" />
                Discharge
              </button>
              <button
                type="button"
                disabled={hospital.occupied_beds >= hospital.total_beds}
                onClick={() => onAdjust(hospital.id, 1)}
                className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-indigo-600 text-white text-xs font-extrabold hover:bg-indigo-700 disabled:opacity-40"
              >
                <UserPlus className="h-4 w-4" />
                Admit
              </button>
            </div>
          </section>
        )
      })}
      {hospitals.length === 0 && (
        <p className="text-sm text-slate-500 bg-white rounded-2xl p-6 border border-slate-100">
          No hospital data is currently available.
        </p>
      )}
    </div>
  </div>
)
