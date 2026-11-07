import { useNavigate } from 'react-router-dom'
import { Database, Terminal, Activity, HeartPulse, Truck, Building2 } from 'lucide-react'

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
  const navigate = useNavigate()

  const actions = [
    {
      label: 'Seed Database',
      description: 'Populate Supabase tables with sample data',
      icon: Database,
      color: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50',
      onClick: onSeed,
    },
    {
      label: 'Capacity Stress Test',
      description: 'Simulate emergency bed influx',
      icon: Activity,
      color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
      onClick: onTestCapacity,
    },
    {
      label: 'Supabase SQL Setup',
      description: 'Copy schema.sql migration code',
      icon: Terminal,
      color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50',
      onClick: onNavigateSql,
    },
    {
      label: 'Citizen Help Portal',
      description: 'Public hospital finder & emergency ambulance (/find-help)',
      icon: HeartPulse,
      color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50',
      onClick: () => navigate('/find-help'),
    },
    {
      label: 'Ambulance Driver Portal',
      description: 'Active trips, status updates & past ride history (/driver)',
      icon: Truck,
      color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50',
      onClick: () => navigate('/driver'),
    },
    {
      label: 'Hospital ER Portal',
      description: 'Incoming ambulance feed & ER shift activity audit (/hospital)',
      icon: Building2,
      color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/50',
      onClick: () => navigate('/hospital'),
    },
  ]

  return (
    <div>
      <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4">
        ACTIONS RAPIDES & CONTROLES
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((act, i) => {
          const Icon = act.icon
          return (
            <button
              key={i}
              onClick={act.onClick}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-[0_12px_30px_-6px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200 text-left group flex items-start space-x-4"
            >
              <div
                className={`h-12 w-12 rounded-2xl ${act.color} border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{act.label}</h4>
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
