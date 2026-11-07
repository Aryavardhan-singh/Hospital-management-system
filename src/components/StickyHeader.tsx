import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Bell, Database, RefreshCw, HeartPulse, ShieldCheck, Settings, X, Truck, Building2 } from 'lucide-react'
import { Button } from './ui/button'
import { ROLE_OPTIONS, SelectableRole } from '@/types/roles'
import { ThemeToggle } from './ThemeToggle'
import { PWAUpdateButton } from './PWAUpdateButton'
import { LanguageToggle } from './LanguageToggle'
import { useTranslation } from 'react-i18next'

interface StickyHeaderProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  isLive: boolean
  isSeeding: boolean
  onSeed: () => void
  onRefresh: () => void
  role: Exclude<SelectableRole, 'citizen'>
  onRoleChange: (role: SelectableRole) => void
}

export const StickyHeader: React.FC<StickyHeaderProps> = ({
  searchTerm,
  setSearchTerm,
  isLive,
  isSeeding,
  onSeed,
  onRefresh,
  role,
  onRoleChange,
}) => {
  const { t } = useTranslation()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <header className="h-[76px] bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm transition-colors duration-200">
      {/* Left: Search Bar & Greeting */}
      <div className="flex items-center space-x-6">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-sans">
            {t('nav.operationsControl')}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
            {t('nav.operationsSub')}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-[280px] lg:w-[320px] hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('nav.searchPlaceholder')}
            className="w-full h-9 pl-9 pr-4 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Right: Actions & Clean Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Role Selector */}
        <label className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
          <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <select
            value={role}
            onChange={(event) => onRoleChange(event.target.value as SelectableRole)}
            className="max-w-[150px] sm:max-w-[180px] bg-transparent text-xs font-extrabold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
            aria-label="Switch demo role"
            title="Demo role switcher"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="dark:bg-slate-900 dark:text-slate-100">
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {/* Refresh button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          title={isLive ? 'Refresh data from Supabase' : 'Refresh demo data'}
          className="h-9 px-2.5 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hidden xl:inline-flex"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
          <span className="ml-1.5">{t('nav.refreshData')}</span>
        </Button>

        {/* Citizen Portal Shortcut */}
        <Link
          to="/find-help"
          className="h-9 px-3 rounded-xl text-xs font-extrabold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-center space-x-1.5 shadow-sm transition-all hover:-translate-y-0.5 shrink-0"
          title="Open Citizen Hospital Finder & Emergency Ambulance Request"
        >
          <HeartPulse className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
          <span className="hidden lg:inline">{t('nav.citizenPortal')}</span>
          <span className="text-[10px] font-black uppercase px-1.5 py-0.2 bg-rose-600 text-white rounded">
            108
          </span>
        </Link>

        {/* Settings & Preferences Popover Button */}
        <div className="relative">
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-colors ${
              isSettingsOpen
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-400'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title="Display & Preferences Settings"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>

          {isSettingsOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Preferences & Tools</span>
                <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Language</span>
                  <LanguageToggle compact={false} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Theme</span>
                  <ThemeToggle />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">PWA Update</span>
                  <PWAUpdateButton />
                </div>

                {role === 'admin' && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      onClick={() => {
                        onSeed()
                        setIsSettingsOpen(false)
                      }}
                      disabled={isSeeding}
                      className="w-full h-8 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center space-x-2"
                    >
                      <Database className="h-3.5 w-3.5" />
                      <span>{isSeeding ? t('nav.seeding') : t('nav.seedDatabase')}</span>
                    </Button>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Quick Portals</span>
                  <Link
                    to="/driver"
                    className="flex items-center gap-2 p-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => setIsSettingsOpen(false)}
                  >
                    <Truck className="h-3.5 w-3.5 text-blue-500" /> Driver Workspace
                  </Link>
                  <Link
                    to="/hospital"
                    className="flex items-center gap-2 p-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => setIsSettingsOpen(false)}
                  >
                    <Building2 className="h-3.5 w-3.5 text-purple-500" /> Hospital ER Workspace
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* Notifications Icon with Badge */}
        <button aria-label="Notifications" className="h-9 w-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900 animate-pulse" />
        </button>

        {/* User Profile Component */}
        <div className="flex items-center space-x-2.5 pl-1">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-extrabold text-xs shadow-md shadow-indigo-600/20">
            DR
          </div>
          <div className="hidden 2xl:block">
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 leading-snug">
              Dr. Alex Vance
            </h4>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              Chief Medical Officer
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
