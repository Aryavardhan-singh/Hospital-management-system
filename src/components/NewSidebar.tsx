import React from 'react'
import {
  LayoutDashboard,
  Building2,
  Truck,
  Database,
  Activity,
  ChevronRight,
  HelpCircle,
  ShieldCheck,
  Radio,
} from 'lucide-react'

interface NewSidebarProps {
  activeTab: 'overview' | 'hospitals' | 'ambulances' | 'schema'
  setActiveTab: (tab: 'overview' | 'hospitals' | 'ambulances' | 'schema') => void
  hospitalCount: number
  ambulanceCount: number
  isLive: boolean
}

export const NewSidebar: React.FC<NewSidebarProps> = ({
  activeTab,
  setActiveTab,
  hospitalCount,
  ambulanceCount,
  isLive,
}) => {
  const mainNav = [
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
      label: 'Fleet & Dispatch',
      icon: Truck,
      badge: ambulanceCount > 0 ? ambulanceCount : null,
    },
  ]

  const systemNav = [
    {
      id: 'schema',
      label: 'Supabase SQL Setup',
      icon: Database,
      badge: 'SQL',
    },
  ]

  return (
    <aside className="w-[280px] bg-[#0f172a] text-slate-300 flex flex-col justify-between shrink-0 h-screen select-none z-20 shadow-xl">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center space-x-3.5">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white font-sans">
              MedNet<span className="text-indigo-400">Ops</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">
              Emergency Command
            </p>
          </div>
        </div>

        {/* Live Signal Indicator Badge */}
        <div className="mx-4 my-4 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  isLive ? 'bg-emerald-400 opacity-75' : 'bg-amber-400 opacity-75'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isLive ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
            </span>
            <span className="text-xs font-semibold text-slate-200">
              {isLive ? 'Supabase Realtime' : 'Mock Preview Mode'}
            </span>
          </div>
          <Radio className={`h-4 w-4 ${isLive ? 'text-emerald-400' : 'text-amber-400'}`} />
        </div>

        {/* Main Navigation Group */}
        <div className="px-4 py-2 space-y-6">
          <div>
            <div className="px-3 pb-2 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
              GESTION & OPERATIONS
            </div>
            <nav className="space-y-1">
              {mainNav.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 translate-x-1'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {item.badge !== null && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isActive
                              ? 'bg-indigo-700 text-white'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight
                        className={`h-3.5 w-3.5 transition-transform ${
                          isActive ? 'text-white rotate-90' : 'text-slate-600'
                        }`}
                      />
                    </div>
                  </button>
                )
              })}
            </nav>
          </div>

          <div>
            <div className="px-3 pb-2 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
              SYSTEME & SECUTRITE
            </div>
            <nav className="space-y-1">
              {systemNav.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 translate-x-1'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight
                      className={`h-3.5 w-3.5 ${
                        isActive ? 'text-white rotate-90' : 'text-slate-600'
                      }`}
                    />
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom Emergency Help / Support Card */}
      <div className="p-4">
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 relative overflow-hidden">
          <div className="flex items-start space-x-3 relative z-10">
            <div className="h-8 w-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <HelpCircle className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-white">Emergency Support</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Citywide dispatch protocols active.
              </p>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <div className="flex items-center space-x-1 text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              <span>RLS DEMO OPEN</span>
            </div>
            <span>v2.4.0</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
