import React from 'react'
import { Database, Truck, Terminal, Activity } from 'lucide-react'

interface QuickActionsGridProps {
  onSeed: () => void
  onNavigateSql: () => void
  onTestCapacity: () => void
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  onSeed,
  onNavigateSql,
  onTestCapacity,
}) => {
  const actions = [
    {
      label: 'Seed Database',
      description: 'Populate Supabase tables with sample data',
      icon: Database,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      onClick: onSeed,
    },
    {
      label: 'Capacity Stress Test',
      description: 'Simulate emergency bed influx',
      icon: Activity,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      onClick: onTestCapacity,
    },
    {
      label: 'Supabase SQL Setup',
      description: 'Copy schema.sql migration code',
      icon: Terminal,
      color: 'bg-amber-50 text-amber-600 border-amber-100',
      onClick: onNavigateSql,
    },
    {
      label: 'Fleet Telemetry',
      description: 'View active emergency dispatch units',
      icon: Truck,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
      onClick: () => {},
    },
  ]

  return (
    <div>
      <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4">
        ACTIONS RAPIDES & CONTROLES
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((act, i) => {
          const Icon = act.icon
          return (
            <button
              key={i}
              onClick={act.onClick}
              className="p-5 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_30px_-6px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200 text-left group flex items-start space-x-4"
            >
              <div
                className={`h-12 w-12 rounded-2xl ${act.color} border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">{act.label}</h4>
                <p className="text-xs text-slate-400 font-medium mt-0.5 leading-snug">
                  {act.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
