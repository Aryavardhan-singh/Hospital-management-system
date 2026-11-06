import { useState, useCallback } from 'react'
import { NewSidebar } from './components/NewSidebar'
import { StickyHeader } from './components/StickyHeader'
import { GlassmorphicBanner } from './components/GlassmorphicBanner'
import { KpiRow } from './components/KpiRow'
import { AnalyticsGrid } from './components/AnalyticsGrid'
import { QuickActionsGrid } from './components/QuickActionsGrid'
import { HospitalsNetworkPage } from './pages/HospitalsNetworkPage'
import { FleetDispatchPage } from './pages/FleetDispatchPage'
import { HospitalPreArrivalPanel } from './components/HospitalPreArrivalPanel'
import { AnalyticsPanel } from './components/AnalyticsPanel'
import { SqlViewer } from './components/SqlViewer'
import { useSupabaseData } from './hooks/useSupabaseData'
import { useAmbulanceSimulation } from './hooks/useAmbulanceSimulation'
import { useToasts, ToastNotifications } from './components/ToastNotifications'
import { Info, AlertCircle, Database } from 'lucide-react'

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'hospitals' | 'ambulances' | 'alerts' | 'analytics' | 'schema'>('overview')
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
    addAmbulances,
    updateBedOccupancy,
    updateAmbulance,
  } = useSupabaseData()

  // ── Toast System ────────────────────────────────────────────
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts()

  const handleReroute = useCallback(
    (ambulanceId: string, fromName: string, toName: string) => {
      pushToast(
        'reroute',
        `Auto-Reroute: ${ambulanceId}`,
        `${fromName} redirected to ${toName}`
      )
    },
    [pushToast]
  )

  const { divertAmbulance, acceptAmbulance } = useAmbulanceSimulation(
    ambulances,
    hospitals,
    updateAmbulance,
    handleReroute,
    undefined,
    undefined,
    { enableMovement: false, enableAutoDiversion: false }
  )

  const handleAcceptPatient = async (ambulanceId: string) => {
    await acceptAmbulance(ambulanceId)
    pushToast(
      'info',
      `ER Accepted: ${ambulanceId}`,
      'Emergency bay prepared and staff alerted for incoming arrival.'
    )
  }

  const handleDivertPatient = async (
    ambulanceId: string,
    fromHospitalId: string,
    reason?: string
  ) => {
    const result = await divertAmbulance(ambulanceId, reason)
    if (result) {
      const fromHospital =
        hospitals.find((h) => h.id === fromHospitalId)?.name || 'Current Hospital'
      pushToast(
        'reroute',
        `ER Divert: ${ambulanceId}`,
        `Rerouted from ${fromHospital} → ${result.hospital.name}${reason ? ` (${reason})` : ''}`
      )
    }
    return result
  }

  const incomingAlertCount = ambulances.filter(
    (a) => a.status !== 'idle' && a.assigned_hospital_id
  ).length

  return (
    <div className="flex h-screen w-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      {/* 280px Fixed Dark Navy Sidebar */}
      <NewSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hospitalCount={hospitals.length}
        ambulanceCount={ambulances.length}
        incomingAlertCount={incomingAlertCount}
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

        {/* Toast Notifications */}
        <ToastNotifications toasts={toasts} onDismiss={dismissToast} />

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
          {activeTab === 'ambulances' && (
            <FleetDispatchPage
              hospitals={hospitals}
              ambulances={ambulances}
              isSeeding={isSeeding}
              refetch={refetch}
              seedDatabase={seedDatabase}
              updateAmbulance={updateAmbulance}
              addAmbulances={addAmbulances}
              updateBedOccupancy={updateBedOccupancy}
            />
          )}

          {/* TAB 4: ER PRE-ARRIVAL NOTIFICATION PORTAL */}
          {activeTab === 'alerts' && (
            <HospitalPreArrivalPanel
              hospitals={hospitals}
              ambulances={ambulances}
              onAcceptPatient={handleAcceptPatient}
              onDivertPatient={handleDivertPatient}
            />
          )}

          {/* TAB 5: RESPONSE ANALYTICS */}
          {activeTab === 'analytics' && (
            <AnalyticsPanel hospitals={hospitals} ambulances={ambulances} />
          )}

          {/* TAB 6: DATABASE SQL SETUP */}
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
