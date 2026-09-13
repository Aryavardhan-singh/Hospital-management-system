import React from 'react'
import { Search, Bell, Database, UserCheck, Sparkles, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'

interface StickyHeaderProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  isLive: boolean
  isSeeding: boolean
  onSeed: () => void
  onRefresh: () => void
}

export const StickyHeader: React.FC<StickyHeaderProps> = ({
  searchTerm,
  setSearchTerm,
  isLive,
  isSeeding,
  onSeed,
  onRefresh,
}) => {
  return (
    <header className="h-[80px] bg-white border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      {/* Left: Search Bar & Greeting */}
      <div className="flex items-center space-x-6">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight font-sans">
            Operations Control Panel
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Real-time hospital capacity & emergency dispatch telemetry
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-[340px] hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search hospital, specialty, or ambulance..."
            className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Right: Actions & User Profile */}
      <div className="flex items-center space-x-4">
        {/* Refresh & Seed Action Buttons */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="h-10 rounded-2xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 space-x-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
          <span className="hidden sm:inline">Refresh Data</span>
        </Button>

        <Button
          onClick={onSeed}
          disabled={isSeeding}
          className="h-10 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 space-x-2 px-4 border-none"
        >
          <Database className="h-4 w-4" />
          <span>{isSeeding ? 'Seeding...' : 'Seed Database'}</span>
        </Button>

        <div className="h-6 w-px bg-slate-200" />

        {/* Notifications Icon with Badge */}
        <button className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 border-2 border-white animate-pulse" />
        </button>

        {/* User Profile Component */}
        <div className="flex items-center space-x-3 pl-2">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-extrabold text-sm shadow-md shadow-indigo-600/20">
            DR
          </div>
          <div className="hidden lg:block">
            <h4 className="text-xs font-extrabold text-slate-900 leading-snug">
              Dr. Alex Vance
            </h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Chief Medical Officer
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
