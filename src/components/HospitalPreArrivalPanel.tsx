import React, { useState, useEffect, useMemo } from 'react'
import { Hospital, Ambulance, ErStatus } from '@/types'
import { RoutingResult } from '@/lib/routing'
import { getRoadRoute } from '@/lib/osrm'
import { Button } from './ui/button'
import {
  BellRing,
  CheckCircle2,
  ArrowRightLeft,
  Truck,
  Building2,
  Clock,
  MapPin,
  HeartPulse,
  Activity,
  ShieldAlert,
  Radio,
  Filter,
  Check,
  Zap,
} from 'lucide-react'

export interface HospitalPreArrivalPanelProps {
  hospitals: Hospital[]
  ambulances: Ambulance[]
  selectedHospitalId?: string | null
  onSelectHospital?: (hospitalId: string | null) => void
  onAcceptPatient?: (ambulanceId: string) => Promise<void> | void
  onDivertPatient?: (
    ambulanceId: string,
    fromHospitalId: string,
    reason?: string
  ) => Promise<RoutingResult | null> | void
  isEmbedded?: boolean
}

// Distance helper
const KM_PER_DEG = 111.0
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = (bLat - aLat) * KM_PER_DEG
  const dLng = (bLng - aLng) * KM_PER_DEG * Math.cos((aLat * Math.PI) / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

export const HospitalPreArrivalPanel: React.FC<HospitalPreArrivalPanelProps> = ({
  hospitals,
  ambulances,
  selectedHospitalId: propSelectedHospitalId,
  onSelectHospital,
  onAcceptPatient,
  onDivertPatient,
  isEmbedded = false,
}) => {
  const [internalSelectedHospitalId, setInternalSelectedHospitalId] = useState<string | null>(
    propSelectedHospitalId ?? null
  )

  const activeHospitalId = propSelectedHospitalId !== undefined
    ? propSelectedHospitalId
    : internalSelectedHospitalId

  const handleHospitalChange = (id: string | null) => {
    setInternalSelectedHospitalId(id)
    onSelectHospital?.(id)
  }

  // Reason modal/popover state
  const [divertingId, setDivertingId] = useState<string | null>(null)
  const [divertReason, setDivertReason] = useState<string>('Capacity & Bed Threshold Exceeded')
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  // Local state for live OSRM ETAs keyed by ambulanceId
  const [roadEtas, setRoadEtas] = useState<Record<string, { minutes: number; km: number }>>({})

  // Filter incoming ambulances: non-idle and assigned to a hospital
  const incomingAmbulances = useMemo(() => {
    return ambulances.filter((a) => {
      const isAssigned = a.status !== 'idle' && Boolean(a.assigned_hospital_id)
      if (!isAssigned) return false
      if (activeHospitalId) {
        return a.assigned_hospital_id === activeHospitalId
      }
      return true
    })
  }, [ambulances, activeHospitalId])

  // Fetch real OSRM road routes for incoming ambulances
  useEffect(() => {
    let cancelled = false

    incomingAmbulances.forEach(async (amb) => {
      const targetHospital = hospitals.find((h) => h.id === amb.assigned_hospital_id)
      if (!targetHospital) return

      try {
        const route = await getRoadRoute(
          [amb.lat, amb.lng],
          [targetHospital.lat, targetHospital.lng]
        )
        if (!cancelled && route) {
          setRoadEtas((prev) => ({
            ...prev,
            [amb.id]: {
              minutes: Math.max(1, Math.round(route.durationMinutes)),
              km: Number(route.distanceKm.toFixed(1)),
            },
          }))
        }
      } catch {
        // Fallback handled by getRoadRoute
      }
    })

    return () => {
      cancelled = true
    }
  }, [incomingAmbulances, hospitals])

  // Counts
  const pendingCount = incomingAmbulances.filter(
    (a) => (a.er_status || a.erStatus || 'pending') === 'pending'
  ).length
  const acceptedCount = incomingAmbulances.filter(
    (a) => (a.er_status || a.erStatus) === 'accepted'
  ).length
  const divertedCount = incomingAmbulances.filter(
    (a) => (a.er_status || a.erStatus) === 'diverted'
  ).length

  // Quick Action Handlers
  const handleAccept = async (ambulanceId: string) => {
    setIsProcessing(ambulanceId)
    try {
      await onAcceptPatient?.(ambulanceId)
    } finally {
      setIsProcessing(null)
    }
  }

  const handleDivertSubmit = async (ambulanceId: string, fromHospitalId: string) => {
    setIsProcessing(ambulanceId)
    try {
      await onDivertPatient?.(ambulanceId, fromHospitalId, divertReason)
      setDivertingId(null)
    } finally {
      setIsProcessing(null)
    }
  }

  return (
    <div className={`space-y-6 select-none font-sans ${isEmbedded ? '' : 'p-2 md:p-6'}`}>
      {/* ── Top Header & Hospital Filter ───────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
        <div className="flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/25 shrink-0">
            <BellRing className="h-5 w-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Hospital ER Pre-Arrival Portal
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                Emergency Telemetry
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Live incoming fleet notifications, clinical triage handoffs, and instant diversion protocols
            </p>
          </div>
        </div>

        {/* Hospital Selector (if not locked in modal) */}
        {!isEmbedded && (
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2 text-xs shrink-0">
            <Filter className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span className="text-slate-400 font-extrabold uppercase text-[10px]">Hospital:</span>
            <select
              value={activeHospitalId || 'all'}
              onChange={(e) =>
                handleHospitalChange(e.target.value === 'all' ? null : e.target.value)
              }
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer pr-2"
            >
              <option value="all">All Hospitals Network ({hospitals.length})</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Summary KPI Tiles ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Incoming */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              INCOMING FLEET
            </div>
            <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
              {incomingAmbulances.length}
            </div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Truck className="h-5 w-5" />
          </div>
        </div>

        {/* Pending Triage Approval */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold uppercase text-amber-500 tracking-wider flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
              ACTION PENDING
            </div>
            <div className="text-2xl font-black text-amber-600 mt-0.5 font-mono">
              {pendingCount}
            </div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Pre-Accepted ER Beds */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold uppercase text-emerald-600 tracking-wider">
              ER ACCEPTED
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5 font-mono">
              {acceptedCount}
            </div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Diverted / Rerouted */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold uppercase text-purple-600 tracking-wider">
              DIVERTED UNITS
            </div>
            <div className="text-2xl font-black text-purple-600 mt-0.5 font-mono">
              {divertedCount}
            </div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── Active Incoming Ambulances List ────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-rose-600" />
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Incoming Fleet Telemetry &amp; ER Bays
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-400 font-mono">
            Auto-refresh active
          </span>
        </div>

        {incomingAmbulances.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {incomingAmbulances.map((amb) => {
              const targetHospital = hospitals.find((h) => h.id === amb.assigned_hospital_id)
              const erStatus: ErStatus = amb.er_status || amb.erStatus || 'pending'
              const triage = amb.triage_level || 'urgent'

              // Distance and ETA calculation
              const defaultKm = targetHospital
                ? distanceKm(amb.lat, amb.lng, targetHospital.lat, targetHospital.lng)
                : 0
              const distanceDisplay = roadEtas[amb.id]?.km ?? Number(defaultKm.toFixed(1))
              const etaMinutes =
                roadEtas[amb.id]?.minutes ?? Math.max(1, Math.round((defaultKm / 40) * 60))

              const isDivertingThis = divertingId === amb.id
              const isBusy = isProcessing === amb.id

              // Status styles
              let cardBorder = 'border-slate-100'
              let statusPill = (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  APPROVAL PENDING
                </span>
              )

              if (erStatus === 'accepted') {
                cardBorder = 'border-emerald-300 ring-2 ring-emerald-100/80 bg-emerald-50/20'
                statusPill = (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ER BAY ACCEPTED &amp; PREPPED
                  </span>
                )
              } else if (erStatus === 'diverted') {
                cardBorder = 'border-purple-300 ring-2 ring-purple-100/80 bg-purple-50/20'
                statusPill = (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-purple-600" />
                    REROUTED TO ALTERNATE ER
                  </span>
                )
              }

              return (
                <div
                  key={amb.id}
                  className={`bg-white rounded-3xl p-5 border shadow-sm transition-all duration-200 ${cardBorder}`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left details */}
                    <div className="space-y-2.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="h-9 w-9 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0 border border-indigo-100">
                          <Truck className="h-4.5 w-4.5" />
                        </div>
                        <span className="text-base font-black text-slate-900 tracking-tight font-mono">
                          {amb.id}
                        </span>

                        {/* Simulation Status */}
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {amb.status}
                        </span>

                        {/* ER Status Pill */}
                        {statusPill}

                        {/* Triage Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            triage === 'critical'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                              : triage === 'urgent'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          Triage: {triage}
                        </span>
                      </div>

                      {/* Destination & Condition */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-indigo-500" /> Target Destination
                          </div>
                          <div className="text-xs font-extrabold text-slate-800 mt-0.5 truncate">
                            {targetHospital?.name || 'Unassigned'}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <HeartPulse className="h-3 w-3 text-rose-500" /> Clinical / Triage Notes
                          </div>
                          <div className="text-xs font-semibold text-slate-700 mt-0.5 truncate">
                            {amb.patient_condition || 'Emergency dispatch - Trauma & Resuscitation'}
                          </div>
                        </div>
                      </div>

                      {/* Live Telemetry / ETA */}
                      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-bold">
                          <Clock className="h-3.5 w-3.5 text-indigo-600" />
                          <span className="text-slate-900 font-extrabold">~{etaMinutes} min</span> ETA
                        </span>
                        <span className="flex items-center gap-1 font-bold">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{distanceDisplay} km away</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          GPS: {amb.lat.toFixed(4)}, {amb.lng.toFixed(4)}
                        </span>
                      </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      {/* Accept Button */}
                      <Button
                        size="sm"
                        onClick={() => handleAccept(amb.id)}
                        disabled={isBusy || erStatus === 'accepted'}
                        className={`h-10 px-4 rounded-2xl font-extrabold text-xs space-x-1.5 transition-all shadow-sm ${
                          erStatus === 'accepted'
                            ? 'bg-emerald-600 text-white cursor-default'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                        }`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{erStatus === 'accepted' ? 'Accepted ✓' : 'Accept Patient'}</span>
                      </Button>

                      {/* Divert Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDivertingId(isDivertingThis ? null : amb.id)}
                        disabled={isBusy}
                        className="h-10 px-4 rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 font-extrabold text-xs space-x-1.5 transition-all"
                      >
                        <ArrowRightLeft className="h-4 w-4 text-rose-600" />
                        <span>Divert Patient</span>
                      </Button>
                    </div>
                  </div>

                  {/* Divert Reason & Confirmation Drawer */}
                  {isDivertingThis && targetHospital && (
                    <div className="mt-4 p-4 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 text-rose-900 font-black text-xs">
                          <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                          <span>Initiate Immediate Emergency Divert for {amb.id}</span>
                        </div>
                        <span className="text-[10px] font-bold text-rose-600 uppercase">
                          Smart Reroute Protocol
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-700 font-medium">
                        Diverting will immediately exclude{' '}
                        <strong>{targetHospital.name}</strong>, compute the highest-scoring alternative facility using bed availability and specialties, and automatically redirect the ambulance.
                      </p>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={divertReason}
                          onChange={(e) => setDivertReason(e.target.value)}
                          placeholder="Reason (e.g. ICU at Capacity, Trauma Overload)"
                          className="flex-1 h-9 px-3 bg-white border border-rose-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-400"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            disabled={isBusy}
                            onClick={() => handleDivertSubmit(amb.id, targetHospital.id)}
                            className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/20 border-none space-x-1"
                          >
                            <Zap className="h-3.5 w-3.5" />
                            <span>Confirm Divert</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDivertingId(null)}
                            className="h-9 px-3 rounded-xl border-slate-200 text-slate-600 font-bold text-xs bg-white"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-10 text-center rounded-[2.5rem] bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Radio className="h-6 w-6 text-slate-400" />
            </div>
            <h4 className="text-sm font-extrabold text-slate-800">
              No Incoming Emergency Fleet Arrivals
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
              Ambulances dispatched from the Citizen Help Portal or Fleet Dispatch will automatically appear here with real-time ETA and triage telemetry.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
