import React from 'react'
import {
  LayoutDashboard,
  Building2,
  Truck,
  Database,
  Activity,
  ShieldCheck,
  Radio,
} from 'lucide-react'

interface SidebarProps {
  activeTab: 'hospitals' | 'ambulances' | 'overview' | 'schema'
  setActiveTab: (tab: 'hospitals' | 'ambulances' | 'overview' | 'schema') => void
  hospitalCount: number
  ambulanceCount: number
  isLive: boolean
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  hospitalCount,
  ambulanceCount,
  isLive,
}) => {
  const navItems = [
    {
      id: 'overview',
      label: 'Command Center',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'hospitals',
      label: 'Hospitals Network',
      icon: Building2,
      badge: hospitalCount > 0 ? hospitalCount : null,
    },
    {
      id: 'ambulances',
      label: 'Fleet Dispatch',
      icon: Truck,
      badge: ambulanceCount > 0 ? ambulanceCount : null,
    },
    {
      id: 'schema',
      label: 'Database / SQL',
      icon: Database,
      badge: 'SQL',
    },
  ]

  return (
    <aside className="w-64 bg-slate-950/90 border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-100 shadow-inner">
            <Activity className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider uppercase text-slate-100 font-mono">
              MEDNET-OPS
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wide">
              CITY EMERGENCY COMMAND
            </p>
          </div>
        </div>

        {/* Live Signal Indicator */}
        <div className="mx-3 my-3 p-2.5 rounded-md bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  isLive ? 'bg-emerald-400 opacity-75' : 'bg-amber-400 opacity-75'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isLive ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
            </span>
            <span className="text-slate-300">
              {isLive ? 'SUPABASE REALTIME' : 'MOCK PREVIEW'}
            </span>
          </div>
          <Radio className={`h-3.5 w-3.5 ${isLive ? 'text-emerald-400' : 'text-amber-400'}`} />
        </div>

        {/* Navigation Section */}
        <nav className="p-3 space-y-1">
          <div className="px-2 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
            NAVIGATION
          </div>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-slate-100' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      isActive
                        ? 'bg-slate-700 text-slate-200'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* System Footer Info */}
      <div className="p-3 border-t border-slate-900 bg-slate-950">
        <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800/50 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>RLS DEMO OPEN</span>
          </div>
          <span className="text-[9px] text-slate-600">v1.0.0</span>
        </div>
      </div>
    </aside>
  )
}
