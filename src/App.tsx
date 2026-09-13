import { useState } from 'react'
import { NewSidebar } from './components/NewSidebar'
import { StickyHeader } from './components/StickyHeader'
import { GlassmorphicBanner } from './components/GlassmorphicBanner'
import { KpiRow } from './components/KpiRow'
import { AnalyticsGrid } from './components/AnalyticsGrid'
import { QuickActionsGrid } from './components/QuickActionsGrid'
import { HospitalsNetworkPage } from './pages/HospitalsNetworkPage'
import { FleetDispatchPage } from './pages/FleetDispatchPage'
import { SqlViewer } from './components/SqlViewer'
import { useSupabaseData } from './hooks/useSupabaseData'
import { Info, AlertCircle, Database } from 'lucide-react'

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'hospitals' | 'ambulances' | 'schema'>('overview')
  const [searchTerm, setSearchTerm] = useState('')

  const {
    hospitals,
    ambulances,
    error,
    isLive,
    isConfigured,
    isSeeding,
    refetch,
    seedDatabase,
    updateBedOccupancy,
  } = useSupabaseData()

  return (
    <div className="flex h-screen w-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      {/* 280px Fixed Dark Navy Sidebar */}
      <NewSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hospitalCount={hospitals.length}
        ambulanceCount={ambulances.length}
        isLive={isLive}
      />

      {/* Main Fluid Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#f8fafc]">
        {/* Sticky 80px White Header */}
        <StickyHeader
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          isLive={isLive}
          isSeeding={isSeeding}
          onSeed={seedDatabase}
          onRefresh={refetch}
        />

        {/* Main Body Canvas */}
        <main className="p-8 space-y-8 flex-1">
          {/* Supabase Notice Banner when credentials not set */}
          {!isConfigured && (
            <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-amber-900">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Supabase Credentials Needed for Live Database Telemetry
                  </h4>
                  <p className="text-slate-600 mt-0.5">
                    Currently operating in mock preview mode. Add your Supabase URL & Anon Key to{' '}
                    <code className="text-indigo-600 font-mono font-bold bg-white px-1.5 py-0.5 rounded-lg border border-amber-200">
                      .env.local
                    </code>{' '}
                    to enable real-time PostgreSQL updates.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('schema')}
                className="px-4 py-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-sm shrink-0 flex items-center space-x-1.5 border-none"
              >
                <Database className="h-4 w-4" />
                <span>View SQL Setup Script</span>
              </button>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="p-4 rounded-3xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-3 font-bold">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Glassmorphic Promo Banner */}
              <GlassmorphicBanner onActionClick={seedDatabase} />

              {/* 5-Column KPI Row */}
              <KpiRow hospitals={hospitals} ambulances={ambulances} />

              {/* 12-Column Analytics & Grid */}
              <AnalyticsGrid hospitals={hospitals} ambulances={ambulances} />

              {/* Quick Actions Grid */}
              <QuickActionsGrid
                onSeed={seedDatabase}
                onNavigateSql={() => setActiveTab('schema')}
                onTestCapacity={() => {
                  if (hospitals.length > 0) {
                    updateBedOccupancy(hospitals[0].id, 5)
                  }
                }}
              />
            </div>
          )}

          {/* TAB 2: HOSPITALS NETWORK PAGE */}
          {activeTab === 'hospitals' && <HospitalsNetworkPage />}

          {/* TAB 3: FLEET & DISPATCH PAGE */}
          {activeTab === 'ambulances' && <FleetDispatchPage />}

          {/* TAB 4: DATABASE SQL SETUP */}
          {activeTab === 'schema' && (
            <div className="py-4">
              <SqlViewer />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
