import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { NewSidebar } from './components/NewSidebar'
import { StickyHeader } from './components/StickyHeader'
import { GlassmorphicBanner } from './components/GlassmorphicBanner'
import { KpiRow } from './components/KpiRow'
import { AnalyticsGrid } from './components/AnalyticsGrid'
import { QuickActionsGrid } from './components/QuickActionsGrid'
import { useSupabaseData } from './hooks/useSupabaseData'
import { useAmbulanceSimulation } from './hooks/useAmbulanceSimulation'
import { ToastNotifications } from './components/ToastNotifications'
import { OfflineBanner } from './components/OfflineBanner'
import { useToasts } from './hooks/useToasts'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import { DATA_WRITE_ERROR_EVENT } from './lib/dataErrors'
import { AdminRole, AdminTab, DEFAULT_ROLE_TAB, ROLE_TABS, SelectableRole } from './types/roles'
import { Info, AlertCircle, Database } from 'lucide-react'

const HospitalsNetworkPage = lazy(() =>
  import('./pages/HospitalsNetworkPage').then(({ HospitalsNetworkPage }) => ({ default: HospitalsNetworkPage }))
)
const FleetDispatchPage = lazy(() =>
  import('./pages/FleetDispatchPage').then(({ FleetDispatchPage }) => ({ default: FleetDispatchPage }))
)
const HospitalPreArrivalPanel = lazy(() =>
  import('./components/HospitalPreArrivalPanel').then(({ HospitalPreArrivalPanel }) => ({ default: HospitalPreArrivalPanel }))
)
const AnalyticsPanel = lazy(() =>
  import('./components/AnalyticsPanel').then(({ AnalyticsPanel }) => ({ default: AnalyticsPanel }))
)
const HospitalBedAdjustmentPanel = lazy(() =>
  import('./components/HospitalBedAdjustmentPanel').then(({ HospitalBedAdjustmentPanel }) => ({ default: HospitalBedAdjustmentPanel }))
)
const SqlViewer = lazy(() =>
  import('./components/SqlViewer').then(({ SqlViewer }) => ({ default: SqlViewer }))
)

export default function App() {
  const navigate = useNavigate()
  const [activeRole, setActiveRole] = useState<AdminRole>(() => {
    const storedRole = window.localStorage.getItem('mednet-admin-role')
    return storedRole === 'dispatcher' || storedRole === 'er-staff' ? storedRole : 'admin'
  })
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    const storedRole = window.localStorage.getItem('mednet-admin-role')
    return storedRole === 'dispatcher'
      ? 'ambulances'
      : storedRole === 'er-staff'
        ? 'beds'
        : 'overview'
  })
  const [searchTerm, setSearchTerm] = useState('')

  const {
    hospitals,
    ambulances,
    error,
    isLive,
    isUsingMockData,
    isConfigured,
    isSeeding,
    queuedCount,
    isSyncing,
    flushOfflineQueue,
    refetch,
    seedDatabase,
    addAmbulances,
    updateBedOccupancy,
    updateAmbulance,
  } = useSupabaseData()

  // ── Toast System ────────────────────────────────────────────
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts()
  const { isOnline } = useNetworkStatus()

  const visibleTabs = ROLE_TABS[activeRole]

  const handleRoleChange = (role: SelectableRole) => {
    if (role === 'citizen') {
      navigate('/public')
      return
    }

    window.localStorage.setItem('mednet-admin-role', role)
    setActiveRole(role)
    setActiveTab(DEFAULT_ROLE_TAB[role])
  }

  useEffect(() => {
    const handleWriteError = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string }>).detail
      pushToast('warning', 'Database write failed', detail.message)
    }
    window.addEventListener(DATA_WRITE_ERROR_EVENT, handleWriteError)
    return () => window.removeEventListener(DATA_WRITE_ERROR_EVENT, handleWriteError)
  }, [pushToast])

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
    try {
      await acceptAmbulance(ambulanceId)
      pushToast(
        'info',
        `ER Accepted: ${ambulanceId}`,
        'Emergency bay prepared and staff alerted for incoming arrival.'
      )
    } catch (writeError) {
      pushToast(
        'warning',
        `Could not accept ${ambulanceId}`,
        writeError instanceof Error ? writeError.message : String(writeError)
      )
    }
  }

  const handleDivertPatient = async (
    ambulanceId: string,
    fromHospitalId: string,
    reason?: string
  ) => {
    try {
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
    } catch (writeError) {
      pushToast(
        'warning',
        `Could not divert ${ambulanceId}`,
        writeError instanceof Error ? writeError.message : String(writeError)
      )
      return null
    }
  }

  const incomingAlertCount = ambulances.filter(
    (a) => a.status !== 'idle' && a.assigned_hospital_id
  ).length

  return (
    <div className="flex h-screen w-screen bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 overflow-hidden font-sans">
      {/* 280px Fixed Dark Navy Sidebar */}
      <NewSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hospitalCount={hospitals.length}
        ambulanceCount={ambulances.length}
        incomingAlertCount={incomingAlertCount}
        isLive={isLive}
        isUsingMockData={isUsingMockData}
        visibleTabs={visibleTabs}
      />

      {/* Main Fluid Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#f8fafc] dark:bg-[#0b0f19]">
        {/* Offline & Sync Notification Banner */}
        <OfflineBanner
          isOnline={isOnline}
          queuedCount={queuedCount}
          isSyncing={isSyncing}
          onSyncNow={flushOfflineQueue}
        />

        {/* Sticky 80px White Header */}
        <StickyHeader
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          isLive={isLive}
          isSeeding={isSeeding}
          onSeed={seedDatabase}
          onRefresh={refetch}
          role={activeRole}
          onRoleChange={handleRoleChange}
        />

        {/* Toast Notifications */}
        <ToastNotifications toasts={toasts} onDismiss={dismissToast} />

        {/* Main Body Canvas */}
        <main className="p-8 space-y-8 flex-1">
          <Suspense fallback={<div className="min-h-32 flex items-center justify-center text-sm font-semibold text-slate-500" role="status">Loading view...</div>}>
          {/* Supabase Notice Banner when credentials not set */}
          {(!isConfigured || !isLive || isUsingMockData) && (
            <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-amber-900">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    {!isConfigured
                      ? 'Mock Mode — Supabase Credentials Needed'
                      : isUsingMockData
                        ? 'Supabase Sample Data Fallback Active'
                        : 'Supabase Live Connection Unavailable'}
                  </h4>
                  <p className="text-slate-600 mt-0.5">
                    {!isConfigured
                      ? <>Currently operating with local demo data. Add your Supabase URL &amp; Anon Key to{' '}
                        <code className="text-indigo-600 font-mono font-bold bg-white px-1.5 py-0.5 rounded-lg border border-amber-200">
                          .env.local
                        </code>{' '}to enable real-time PostgreSQL updates.</>
                      : isUsingMockData
                        ? 'The database is configured, but one or more tables are empty or unavailable and are showing local sample data. Confirm persisted records before relying on this view.'
                        : 'A live database connection is not confirmed. Check Supabase status before relying on data persistence.'}
                  </p>
                </div>
              </div>
              {activeRole === 'admin' && <button
                onClick={() => setActiveTab('schema')}
                className="px-4 py-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-sm shrink-0 flex items-center space-x-1.5 border-none"
              >
                <Database className="h-4 w-4" />
                <span>View SQL Setup Script</span>
              </button>}
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
          {activeRole === 'admin' && activeTab === 'overview' && (
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
                    void updateBedOccupancy(hospitals[0].id, 5).catch((writeError: unknown) => {
                      console.error('Quick capacity update failed:', writeError)
                    })
                  }
                }}
              />
            </div>
          )}

          {/* TAB 2: HOSPITALS NETWORK PAGE */}
          {activeRole === 'admin' && activeTab === 'hospitals' && <HospitalsNetworkPage />}

          {/* TAB 3: FLEET & DISPATCH PAGE */}
          {activeRole !== 'er-staff' && activeTab === 'ambulances' && (
            <FleetDispatchPage
              hospitals={hospitals}
              ambulances={ambulances}
              isConfigured={isConfigured}
              isLive={isLive}
              isUsingMockData={isUsingMockData}
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
          {activeRole !== 'er-staff' && activeTab === 'analytics' && (
            <AnalyticsPanel hospitals={hospitals} ambulances={ambulances} />
          )}

          {/* TAB 6: DATABASE SQL SETUP */}
          {activeRole === 'admin' && activeTab === 'schema' && (
            <div className="py-4">
              <SqlViewer />
            </div>
          )}

          {activeRole === 'er-staff' && activeTab === 'beds' && (
            <HospitalBedAdjustmentPanel
              hospitals={hospitals}
              onAdjust={(hospitalId, delta) => {
                void updateBedOccupancy(hospitalId, delta).catch((writeError: unknown) => {
                  console.error('Hospital bed adjustment failed:', writeError)
                })
              }}
            />
          )}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
