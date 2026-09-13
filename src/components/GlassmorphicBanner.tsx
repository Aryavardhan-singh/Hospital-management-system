import React from 'react'
import { Activity, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from './ui/button'

interface GlassmorphicBannerProps {
  onActionClick: () => void
}

export const GlassmorphicBanner: React.FC<GlassmorphicBannerProps> = ({ onActionClick }) => {
  return (
    <div className="relative rounded-[2.5rem] p-8 md:p-10 overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-900 text-white shadow-xl shadow-indigo-600/20">
      {/* Decorative Glow */}
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
        {/* Left Side: Headline & Description */}
        <div className="max-w-xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-extrabold text-indigo-100 border border-white/20">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>REAL-TIME DISPATCH PROTOCOL ENABLED</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
            Automated Emergency Allocation & Capacity Optimization
          </h2>

          <p className="text-xs md:text-sm text-indigo-100/90 font-medium leading-relaxed">
            MedNet Ops connects citywide emergency services directly with Supabase Postgres Realtime. Monitor hospital capacities, re-route ambulances, and prevent emergency room bottlenecks.
          </p>

          <div className="pt-2 flex items-center space-x-4">
            <Button
              onClick={onActionClick}
              className="h-12 px-6 rounded-2xl bg-white text-indigo-600 font-extrabold text-xs hover:bg-slate-100 shadow-lg shadow-black/10 space-x-2 border-none transition-transform hover:scale-[1.02]"
            >
              <span>Seed Test Telemetry</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right Side: Floating Glass Window */}
        <div className="relative shrink-0">
          <div className="w-64 p-5 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl transform md:rotate-2 hover:rotate-0 transition-transform duration-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-200">
                DISPATCH TELEMETRY
              </span>
              <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
            </div>

            <div className="text-3xl font-black text-white">99.8%</div>
            <div className="text-xs font-bold text-indigo-100 mt-0.5">Uptime & Latency &lt; 45ms</div>

            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-indigo-200">
              <span>Active Subscriptions</span>
              <span className="font-extrabold text-white">7 Hospitals</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
