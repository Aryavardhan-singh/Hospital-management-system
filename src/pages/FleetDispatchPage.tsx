import React, { useState, useCallback, useMemo } from 'react'
import { useAmbulanceSimulation } from '@/hooks/useAmbulanceSimulation'
import { useToasts, ToastNotifications } from '@/components/ToastNotifications'
import { RoutingScoreCard } from '@/components/RoutingScoreCard'
import { DispatchMap } from '@/components/DispatchMap'
import { IncidentHotspot } from '@/components/DispatchMap'
import { IncidentSimulationControls } from '@/components/IncidentSimulationControls'
import { CongestionZone, distanceKm, findBestHospital, RoutingResult } from '@/lib/routing'
import { Ambulance, Hospital } from '@/types'
import { Truck, Navigation, Building2, Radio, MapPin, RefreshCw, Database, Zap, Brain, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'

const TRAFFIC_JAM_ZONES: CongestionZone[] = [
  { id: 'traffic-walled-city', name: 'Walled City', lat: 26.9238, lng: 75.8267, radiusKm: 1.4, delayMultiplier: 2.8 },
  { id: 'traffic-tonk-road', name: 'Tonk Road', lat: 26.8697, lng: 75.8032, radiusKm: 1.6, delayMultiplier: 2.4 },
  { id: 'traffic-malviya-nagar', name: 'Malviya Nagar', lat: 26.8543, lng: 75.8051, radiusKm: 1.2, delayMultiplier: 2.6 },
]

const JAIPUR_SIMULATION_CENTER: [number, number] = [26.9124, 75.7873]
const MCI_REQUEST_LOCATIONS: [number, number][] = [
  [26.9124, 75.7873],
  [26.8875, 75.8124],
  [26.8612, 75.779],
  [26.928, 75.822],
  [26.839, 75.795],
]

interface FleetDispatchPageProps {
  hospitals: Hospital[]
  ambulances: Ambulance[]
  isSeeding: boolean
  refetch: () => Promise<void>
  seedDatabase: () => Promise<void>
  updateAmbulance: (id: string, patch: Partial<Ambulance>) => Promise<void>
  addAmbulances: (ambulances: Ambulance[]) => Promise<void>
  updateBedOccupancy: (hospitalId: string, delta: number) => Promise<void>
}

export const FleetDispatchPage: React.FC<FleetDispatchPageProps> = ({
  hospitals,
  ambulances,
  isSeeding,
  refetch,
  seedDatabase,
  updateAmbulance,
  addAmbulances,
  updateBedOccupancy,
}) => {

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

  // ── Local UI state ──────────────────────────────────────────
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string | null>(null)
  const [dispatchingId, setDispatchingId] = useState<string | null>(null)
  const [dispatchSpecialty, setDispatchSpecialty] = useState('')
  const [requiresIcu, setRequiresIcu] = useState(false)
  const [requiresVentilator, setRequiresVentilator] = useState(false)
  const [trafficZones, setTrafficZones] = useState<CongestionZone[]>([])
  const [incidentHotspots, setIncidentHotspots] = useState<IncidentHotspot[]>([])
  const [isSimulating, setIsSimulating] = useState(false)
  const routingOptions = useMemo(
    () => ({ requiresIcu, requiresVentilator, trafficZones }),
    [requiresIcu, requiresVentilator, trafficZones]
  )

  // Store last dispatch result to show score breakdown
  const [lastDispatch, setLastDispatch] = useState<{
    ambulanceId: string
    result: RoutingResult
  } | null>(null)

  const { dispatchAmbulance } = useAmbulanceSimulation(
    ambulances,
    hospitals,
    updateAmbulance,
    handleReroute,
    dispatchSpecialty.trim() || null,
    routingOptions
  )


  // ── KPI counts ──────────────────────────────────────────────
  const idleCount     = ambulances.filter((a) => a.status === 'idle').length
  const enrouteCount  = ambulances.filter((a) => a.status === 'enroute').length
  const occupiedCount = ambulances.filter((a) => a.status === 'occupied').length
  const activeCount   = enrouteCount + occupiedCount

  // ── Dispatch handler ────────────────────────────────────────
  const handleDispatch = async (ambulanceId: string) => {
    setDispatchingId(ambulanceId)
    try {
      const result = await dispatchAmbulance(ambulanceId)
      if (result) {
        setLastDispatch({ ambulanceId, result })
        pushToast(
          'info',
          `${ambulanceId} dispatched → ${result.hospital.name}`,
          `Routing score: ${Math.round(result.breakdown.total * 100)}% · ${result.breakdown.distanceKm.toFixed(1)} km away`
        )
      } else {
        pushToast(
          'warning',
          `No suitable hospital for ${ambulanceId}`,
          'No facility currently meets the selected resource requirements.'
        )
      }
    } catch (error) {
      pushToast(
        'warning',
        `Dispatch failed for ${ambulanceId}`,
        error instanceof Error ? error.message : String(error)
      )
    } finally {
      setDispatchingId(null)
    }
  }

  const handleToggleTraffic = () => {
    setTrafficZones((current) => {
      if (current.length > 0) {
        pushToast('info', 'Traffic simulation cleared', 'Routing scores are back to normal.')
        return []
      }
      pushToast(
        'warning',
        'Traffic jam simulated',
        'Congestion penalties are active for the Walled City, Tonk Road, and Malviya Nagar.'
      )
      return TRAFFIC_JAM_ZONES
    })
  }

  const handleMassCasualty = async () => {
    setIsSimulating(true)
    try {
      const timestamp = Date.now().toString(36)
      const requests = MCI_REQUEST_LOCATIONS.flatMap(([lat, lng], index) => {
        const ambulance: Ambulance = {
          id: `AMB-MCI-${timestamp}-${index + 1}`,
          lat,
          lng,
          status: 'idle',
          assigned_hospital_id: null,
          severity: 'moderate',
        }
        const route = findBestHospital(ambulance, hospitals, null, null, routingOptions)
        if (!route) return []
        return [{
          ...ambulance,
          status: 'enroute' as const,
          assigned_hospital_id: route.hospital.id,
          er_status: 'pending' as const,
          patient_condition: 'Mass casualty simulation request',
          triage_level: 'urgent' as const,
          dispatch_stage: 'enroute_hospital' as const,
          created_at: new Date().toISOString(),
        }]
      })

      if (requests.length === 0) {
        pushToast('warning', 'MCI could not be dispatched', 'No hospitals are currently eligible for these requests.')
        return
      }

      await addAmbulances(requests)
      const hotspot: IncidentHotspot = {
        id: `mci-${timestamp}`,
        name: 'Mass casualty incident',
        lat: 26.8875,
        lng: 75.8124,
        radiusMeters: 900,
      }
      setIncidentHotspots((current) => [...current, hotspot])
      pushToast(
        'warning',
        `MCI simulated: ${requests.length} requests`,
        'Incoming ambulances were balanced across the network using current routing scores.'
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      pushToast('warning', 'MCI simulation failed', message)
    } finally {
      setIsSimulating(false)
    }
  }

  const handleCapacitySurge = async () => {
    const availableHospitals = hospitals
      .filter((hospital) => hospital.total_beds > 0 && hospital.occupied_beds < hospital.total_beds * 0.95)
      .sort((a, b) =>
        distanceKm(JAIPUR_SIMULATION_CENTER[0], JAIPUR_SIMULATION_CENTER[1], a.lat, a.lng) -
        distanceKm(JAIPUR_SIMULATION_CENTER[0], JAIPUR_SIMULATION_CENTER[1], b.lat, b.lng)
      )
    const target = availableHospitals[0]
    if (!target) {
      pushToast('warning', 'Capacity surge unavailable', 'All hospitals are already at or above the diversion threshold.')
      return
    }

    setIsSimulating(true)
    try {
      let inbound = ambulances.find(
        (ambulance) => ambulance.status === 'enroute' && ambulance.assigned_hospital_id === target.id
      )
      if (!inbound) {
        const idleAmbulance = ambulances.find((ambulance) => ambulance.status === 'idle')
        if (idleAmbulance) {
          await updateAmbulance(idleAmbulance.id, {
            status: 'enroute',
            assigned_hospital_id: target.id,
            er_status: 'pending',
            patient_condition: 'Capacity surge diversion test',
            triage_level: 'urgent',
          })
          inbound = { ...idleAmbulance, status: 'enroute', assigned_hospital_id: target.id }
        } else {
          const timestamp = Date.now().toString(36)
          const simulatedInbound: Ambulance = {
            id: `AMB-SURGE-${timestamp}`,
            lat: target.lat - 0.006,
            lng: target.lng - 0.006,
            status: 'enroute',
            assigned_hospital_id: target.id,
            severity: 'moderate',
            er_status: 'pending',
            patient_condition: 'Capacity surge diversion test',
            triage_level: 'urgent',
            dispatch_stage: 'enroute_hospital',
            created_at: new Date().toISOString(),
          }
          await addAmbulances([simulatedInbound])
          inbound = simulatedInbound
        }
      }

      setIncidentHotspots((current) => [
        ...current.filter((hotspot) => hotspot.id !== 'capacity-surge'),
        {
          id: 'capacity-surge',
          name: `${target.name} capacity surge`,
          lat: target.lat,
          lng: target.lng,
          radiusMeters: 700,
        },
      ])
      await updateBedOccupancy(target.id, target.total_beds - target.occupied_beds)
      pushToast(
        'warning',
        `Capacity surge at ${target.name}`,
        `${inbound.id} was en route; capacity has been raised to trigger automatic diversion.`
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      pushToast('warning', 'Capacity surge failed', message)
    } finally {
      setIsSimulating(false)
    }
  }

  const handleClearSimulations = () => {
    setTrafficZones([])
    setIncidentHotspots([])
    pushToast(
      'info',
      'Simulation map overlays cleared',
      'Already-created ambulance requests and hospital occupancy remain in place.'
    )
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

      {/* ── Specialty Preference Filter ───────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-2 text-slate-500 shrink-0">
          <Activity className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold">Patient specialty requirement:</span>
        </div>
        <input
          type="text"
          placeholder="e.g. Cardiology, Trauma, Pediatrics… (leave blank for none)"
          value={dispatchSpecialty}
          onChange={(e) => setDispatchSpecialty(e.target.value)}
          className="flex-1 h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400/30 placeholder-slate-300 w-full"
        />
        {dispatchSpecialty && (
          <button
            onClick={() => setDispatchSpecialty('')}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 shrink-0"
          >
            Clear
          </button>
        )}
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Required resources:
          </span>
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={requiresIcu}
              onChange={(event) => setRequiresIcu(event.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
            ICU bed
          </label>
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={requiresVentilator}
              onChange={(event) => setRequiresVentilator(event.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
            Ventilator
          </label>
        </div>
      </div>

      <IncidentSimulationControls
        trafficActive={trafficZones.length > 0}
        incidentCount={incidentHotspots.length}
        isSimulating={isSimulating}
        onToggleTraffic={handleToggleTraffic}
        onMassCasualty={handleMassCasualty}
        onCapacitySurge={handleCapacitySurge}
        onClear={handleClearSimulations}
      />

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
            trafficZones={trafficZones}
            incidentHotspots={incidentHotspots}
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
