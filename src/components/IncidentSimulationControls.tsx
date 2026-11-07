import React from 'react'
import { Activity, AlertTriangle, Building2, RotateCcw, Truck } from 'lucide-react'

interface IncidentSimulationControlsProps {
  trafficActive: boolean
  incidentCount: number
  isSimulating: boolean
  onToggleTraffic: () => void
  onMassCasualty: () => void
  onCapacitySurge: () => void
  onClear: () => void
}

export const IncidentSimulationControls: React.FC<IncidentSimulationControlsProps> = ({
  trafficActive,
  incidentCount,
  isSimulating,
  onToggleTraffic,
  onMassCasualty,
  onCapacitySurge,
  onClear,
}) => (
  <section className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="h-4 w-4 text-indigo-600" />
          Incident &amp; Simulation Controls
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Run demo scenarios to exercise routing, fleet load, and capacity diversion.
        </p>
      </div>
      {(trafficActive || incidentCount > 0) && (
        <button
          onClick={onClear}
          disabled={isSimulating}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Clear simulations
        </button>
      )}
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <button
        onClick={onToggleTraffic}
        disabled={isSimulating}
        className={`flex items-center justify-between gap-3 p-4 rounded-2xl border text-left transition-colors disabled:opacity-50 ${
          trafficActive
            ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
            : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
        }`}
      >
        <span className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
          <Activity className="h-4 w-4 text-amber-600" />
          Simulate Traffic Jam
        </span>
        <span className={`text-[9px] font-black uppercase ${trafficActive ? 'text-amber-700' : 'text-slate-400'}`}>
          {trafficActive ? 'Active' : 'Off'}
        </span>
      </button>

      <button
        onClick={onMassCasualty}
        disabled={isSimulating}
        className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-left transition-colors disabled:opacity-50"
      >
        <span className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
          <AlertTriangle className="h-4 w-4 text-rose-600" />
          Mass Casualty Incident
        </span>
        <Truck className="h-4 w-4 text-slate-400 shrink-0" />
      </button>

      <button
        onClick={onCapacitySurge}
        disabled={isSimulating}
        className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-left transition-colors disabled:opacity-50"
      >
        <span className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
          <Building2 className="h-4 w-4 text-indigo-600" />
          Hospital Capacity Surge
        </span>
        <span className="text-[9px] font-black uppercase text-slate-400">Near full</span>
      </button>
    </div>
  </section>
)
