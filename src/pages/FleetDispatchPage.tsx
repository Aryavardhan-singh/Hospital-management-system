import React, { useState, useCallback } from 'react'
import { useSupabaseData } from '@/hooks/useSupabaseData'
import { useAmbulanceSimulation } from '@/hooks/useAmbulanceSimulation'
import { useToasts, ToastNotifications } from '@/components/ToastNotifications'
import { RoutingScoreCard } from '@/components/RoutingScoreCard'
import { DispatchMap } from '@/components/DispatchMap'
import { RoutingResult } from '@/lib/routing'
import { Truck, Navigation, Building2, Radio, MapPin, RefreshCw, Database, Zap, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const FleetDispatchPage: React.FC = () => {
  const {
    hospitals,
    ambulances,
    loading,
    isLive,
    isSeeding,
    refetch,
    seedDatabase,
    updateAmbulance,
  } = useSupabaseData()

  // ── Toast System ────────────────────────────────────────────
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts()

  // ── Reroute callback fired by auto-diversion watcher ────────
  const handleReroute = useCallback(
    (ambulanceId: string, fromName: string, toName: string) => {
      pushToast(
        'reroute',
        `Auto-Reroute: ${ambulanceId}`,
        `${fromName} reached capacity — redirected to ${toName}`
      )
    },
    [pushToast]
  )

  const { dispatchAmbulance } = useAmbulanceSimulation(
    ambulances,
    hospitals,
    updateAmbulance,
    handleReroute
  )

  // ── Local UI state ──────────────────────────────────────────
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string | null>(null)
  const [dispatchingId, setDispatchingId] = useState<string | null>(null)

  // Store last dispatch result to show score breakdown
  const [lastDispatch, setLastDispatch] = useState<{
    ambulanceId: string
    result: RoutingResult
  } | null>(null)

  // ── KPI counts ──────────────────────────────────────────────
  const idleCount     = ambulances.filter((a) => a.status === 'idle').length
  const enrouteCount  = ambulances.filter((a) => a.status === 'enroute').length
  const occupiedCount = ambulances.filter((a) => a.status === 'occupied').length
  const activeCount   = enrouteCount + occupiedCount

  // ── Dispatch handler ────────────────────────────────────────
  const handleDispatch = async (ambulanceId: string) => {
    setDispatchingId(ambulanceId)
    const result = await dispatchAmbulance(ambulanceId)
    setDispatchingId(null)

    if (result) {
      setLastDispatch({ ambulanceId, result })
      pushToast(
        'info',
        `${ambulanceId} dispatched → ${result.hospital.name}`,
        `Routing score: ${Math.round(result.breakdown.total * 100)}% · ${result.breakdown.distanceKm.toFixed(1)} km away`
      )
    }
  }

  return (
    <div className="space-y-6 select-none font-sans">
      {/* ── Toast Container ─────────────────────────────────── */}
      <ToastNotifications toasts={toasts} onDismiss={dismissToast} />

      {/* ── Page Title & Actions ────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Truck className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Emergency Fleet &amp; Dispatch
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {ambulances.length} UNITS
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Smart-routed Jaipur emergency fleet with real-time auto-diversion &amp; capacity awareness
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            className="h-10 px-4 rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs space-x-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Refresh Data</span>
          </Button>

          <Button
            size="sm"
            onClick={seedDatabase}
            disabled={isSeeding}
            className="h-10 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 space-x-2 border-none"
          >
            <Database className="h-4 w-4" />
            <span>{isSeeding ? 'Seeding...' : 'Seed Database'}</span>
          </Button>
        </div>
      </div>

      {/* ── KPI Bar ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">ACTIVE FLEET IN FIELD</div>
            <div className="text-2xl lg:text-3xl font-black text-slate-900 mt-0.5 font-mono">
              {activeCount} <span className="text-xs font-bold text-slate-400">/ {ambulances.length}</span>
            </div>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <Truck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">IDLE / STAGED UNITS</div>
            <div className="text-2xl lg:text-3xl font-black text-slate-600 mt-0.5 font-mono">{idleCount}</div>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0">
            <Navigation className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">EN ROUTE TO HOSPITAL</div>
            <div className="text-2xl lg:text-3xl font-black text-blue-600 mt-0.5 font-mono">{enrouteCount}</div>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">PATIENT OCCUPIED</div>
            <div className="text-2xl lg:text-3xl font-black text-orange-600 mt-0.5 font-mono">{occupiedCount}</div>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shrink-0">
            <Truck className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── Main Split: Map + Fleet Panel ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map */}
        <div className="lg:col-span-8 h-[640px]">
          <DispatchMap
            hospitals={hospitals}
            ambulances={ambulances}
            selectedAmbulanceId={selectedAmbulanceId}
          />
        </div>

        {/* Fleet Side Panel */}
        <div className="lg:col-span-4 bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] h-[640px] flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center space-x-2">
              <Truck className="h-5 w-5 text-indigo-600" />
              <h3 className="text-base font-extrabold text-slate-900">Live Fleet Monitor</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-100">
                <Brain className="h-3 w-3 text-indigo-600" />
                <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-wider">Smart Route</span>
              </div>
            </div>
          </div>

          {/* Ambulance list */}
          <div className="space-y-3 mt-4 overflow-y-auto flex-1 pr-1">
            {ambulances.map((amb) => {
              const assignedHospital = hospitals.find((h) => h.id === amb.assigned_hospital_id)
              const isSelected = selectedAmbulanceId === amb.id
              const isIdle = amb.status === 'idle'
              const isDispatching = dispatchingId === amb.id
              const showScoreCard =
                lastDispatch?.ambulanceId === amb.id && lastDispatch.result

              return (
                <div
                  key={amb.id}
                  onClick={() => setSelectedAmbulanceId(amb.id)}
                  className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-300 shadow-md shadow-indigo-600/10'
                      : 'bg-slate-50/60 border-slate-100 hover:bg-slate-100/60'
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs ${
                          amb.status === 'occupied'
                            ? 'bg-orange-100 text-orange-700'
                            : amb.status === 'enroute'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Truck className="h-4 w-4" />
                      </div>
                      <span className="font-extrabold text-slate-900 text-sm">{amb.id}</span>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        amb.status === 'occupied'
                          ? 'bg-orange-100 text-orange-700 border border-orange-200'
                          : amb.status === 'enroute'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-slate-200 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {amb.status}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="flex items-center gap-1 text-[11px]">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" /> Location:
                      </span>
                      <span className="font-mono text-slate-800 font-extrabold text-[11px]">
                        {amb.lat.toFixed(4)}, {amb.lng.toFixed(4)}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-slate-800 font-bold">
                      <span className="text-[10px] text-slate-400 uppercase font-extrabold">Destination:</span>
                      <span className="truncate text-xs flex items-center gap-1">
                        {assignedHospital ? (
                          <>
                            <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                            <span className="text-slate-900">{assignedHospital.name}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic font-normal">Unassigned</span>
                        )}
                      </span>
                    </div>

                    {/* Dispatch button for idle units */}
                    {isIdle && (
                      <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDispatch(amb.id)}
                          disabled={isDispatching}
                          className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-extrabold transition-all duration-150 border ${
                            isDispatching
                              ? 'bg-indigo-50 text-indigo-400 border-indigo-100 cursor-not-allowed'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-sm shadow-indigo-600/20'
                          }`}
                        >
                          <Zap className="h-3.5 w-3.5" />
                          {isDispatching ? 'Routing...' : 'Smart Dispatch'}
                        </button>
                      </div>
                    )}

                    {/* Routing score breakdown — shown after dispatch */}
                    {showScoreCard && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <RoutingScoreCard
                          hospitalName={lastDispatch.result.hospital.name}
                          breakdown={lastDispatch.result.breakdown}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 shrink-0 flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Click unit to focus map · Smart routing active</span>
            <span className="font-mono text-indigo-600">Jaipur Fleet</span>
          </div>
        </div>
      </div>
    </div>
  )
}
