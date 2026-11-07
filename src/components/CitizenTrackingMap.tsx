import React, { useEffect, useState, useMemo, useRef } from 'react'
import { Hospital, Ambulance, DispatchStage } from '@/types'
import { MapLibreMapView, MapLibreMapMarker, MapLibreMapHandle } from '@/components/MapLibreMapView'
import { getMultiStopRoadRoute, getRoadRoute } from '@/lib/osrm'
import { distanceKm } from '@/lib/routing'
import {
  Truck,
  Building2,
  Clock,
  Phone,
  CheckCircle2,
  Navigation,
  AlertCircle,
  Crosshair,
} from 'lucide-react'

export interface CitizenTrackingMapProps {
  citizenLat: number
  citizenLng: number
  ambulance: Ambulance
  hospital: Hospital
  onReset?: () => void
  onCancel?: () => void
}

// ── Step Definition ──────────────────────────────────────────────────────────
const STAGES: { key: DispatchStage; label: string; desc: string }[] = [
  { key: 'dispatched', label: 'Ambulance Dispatched', desc: 'Unit assigned and departing depot' },
  { key: 'enroute_pickup', label: 'En Route to You', desc: 'Navigating to your emergency location' },
  { key: 'picked_up', label: 'Patient Picked Up', desc: 'Paramedics on scene and patient secured' },
  { key: 'enroute_hospital', label: 'En Route to Hospital', desc: 'Express transport to emergency department' },
  { key: 'arrived', label: 'Arrived at Facility', desc: 'Transferred to hospital trauma care' },
]

function bearingDegrees(start: [number, number], end: [number, number]) {
  const toRadians = (degrees: number) => degrees * Math.PI / 180
  const startLatitude = toRadians(start[0])
  const endLatitude = toRadians(end[0])
  const longitudeDelta = toRadians(end[1] - start[1])
  const y = Math.sin(longitudeDelta) * Math.cos(endLatitude)
  const x = Math.cos(startLatitude) * Math.sin(endLatitude) -
    Math.sin(startLatitude) * Math.cos(endLatitude) * Math.cos(longitudeDelta)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

export const CitizenTrackingMap: React.FC<CitizenTrackingMapProps> = ({
  citizenLat,
  citizenLng,
  ambulance,
  hospital,
  onReset,
  onCancel,
}) => {
  // Road route coordinates for polyline
  const [routeLine, setRouteLine] = useState<[number, number][]>([])
  const [pickupMinutes, setPickupMinutes] = useState<number>(3)
  const [hospitalMinutes, setHospitalMinutes] = useState<number>(10)
  const [pickupKm, setPickupKm] = useState<number>(1.2)
  const [hospitalKm, setHospitalKm] = useState<number>(4.5)

  // Ref to MapLibreMapView so we can call flyToAmbulance()
  const mapViewRef = useRef<MapLibreMapHandle>(null)

  // Current stage determination
  const currentStage: DispatchStage = useMemo(() => {
    if (ambulance.dispatch_stage) {
      return ambulance.dispatch_stage
    }
    if (ambulance.status === 'occupied') {
      return 'arrived'
    }
    return 'enroute_pickup'
  }, [ambulance.dispatch_stage, ambulance.status])

  const stageIndex = useMemo(() => {
    const idx = STAGES.findIndex((s) => s.key === currentStage)
    return idx >= 0 ? idx : 1
  }, [currentStage])

  // Fetch full road route connecting Ambulance -> Citizen -> Hospital
  useEffect(() => {
    let active = true

    const fetchRoute = async () => {
      const waypoints: [number, number][] = [
        [ambulance.lat, ambulance.lng],
        [citizenLat, citizenLng],
        [hospital.lat, hospital.lng],
      ]

      try {
        const fullRoute = await getMultiStopRoadRoute(waypoints)
        if (active && fullRoute.coordinates.length > 0) {
          setRouteLine(fullRoute.coordinates)
        }

        // Calculate pickup route
        const toPickup = await getRoadRoute([ambulance.lat, ambulance.lng], [citizenLat, citizenLng])
        if (active) {
          setPickupMinutes(Math.max(1, Math.round(toPickup.durationMinutes)))
          setPickupKm(Number(toPickup.distanceKm.toFixed(1)))
        }

        // Calculate to hospital route
        const toHospital = await getRoadRoute([citizenLat, citizenLng], [hospital.lat, hospital.lng])
        if (active) {
          setHospitalMinutes(Math.max(1, Math.round(toHospital.durationMinutes)))
          setHospitalKm(Number(toHospital.distanceKm.toFixed(1)))
        }
      } catch {
        // Fallback to straight line segments
        if (active) {
          setRouteLine(waypoints)
          const dPickup = distanceKm(ambulance.lat, ambulance.lng, citizenLat, citizenLng)
          setPickupMinutes(Math.max(1, Math.round((dPickup / 40) * 60)))
          setPickupKm(Number(dPickup.toFixed(1)))
        }
      }
    }

    fetchRoute()

    return () => {
      active = false
    }
  }, [ambulance.lat, ambulance.lng, citizenLat, citizenLng, hospital.lat, hospital.lng])

  // Center coordinate for map
  const mapCenter: [number, number] = [citizenLat, citizenLng]
  const mapMarkers = useMemo<MapLibreMapMarker[]>(() => [
    {
      id: 'citizen-location',
      title: 'Your location',
      detail: `Ambulance arriving in ~${pickupMinutes} min · ${citizenLat.toFixed(4)}, ${citizenLng.toFixed(4)}`,
      kind: 'citizen',
      lat: citizenLat,
      lng: citizenLng,
    },
    {
      id: `ambulance-${ambulance.id}`,
      title: `Ambulance ${ambulance.id}`,
      detail: `${currentStage.replace('_', ' ')} · ${ambulance.lat.toFixed(4)}, ${ambulance.lng.toFixed(4)}`,
      kind: 'ambulance',
      status: ambulance.status,
      lat: ambulance.lat,
      lng: ambulance.lng,
      heading: routeLine.length > 1
        ? bearingDegrees(routeLine[0], routeLine[1])
        : bearingDegrees([ambulance.lat, ambulance.lng], [citizenLat, citizenLng]),
    },
    {
      id: `hospital-${hospital.id}`,
      title: hospital.name,
      detail: `Destination hospital · ${Math.max(0, hospital.total_beds - hospital.occupied_beds)} beds currently available`,
      kind: 'hospital',
      color: 'green',
      lat: hospital.lat,
      lng: hospital.lng,
    },
  ], [ambulance, citizenLat, citizenLng, currentStage, hospital, pickupMinutes, routeLine])

  return (
    <div className="space-y-6 font-sans select-none animate-in fade-in duration-300">
      {/* ── Status Banner & Callout ───────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-indigo-100 dark:border-slate-800 shadow-[0_4px_24px_-4px_rgba(79,70,229,0.08)] dark:shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
              <Truck className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Emergency Unit En Route: {ambulance.id}
                </h2>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Live GPS telemetry connected to Jaipur Emergency Dispatch Network
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="tel:108"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/20 transition-colors"
            >
              <Phone className="h-4 w-4" />
              <span>Call Paramedics (108)</span>
            </a>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors border border-rose-200/80 dark:border-rose-800"
                title="Cancel ambulance dispatch"
              >
                Cancel Request
              </button>
            )}

            {onReset && (
              <button
                onClick={onReset}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors border border-slate-200 dark:border-slate-700"
              >
                Back to Search
              </button>
            )}
          </div>
        </div>

        {/* ── 5-Step Dispatch Progress Tracker ───────────────────────── */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {STAGES.map((stage, idx) => {
              const isPast = idx < stageIndex
              const isCurrent = idx === stageIndex

              return (
                <div
                  key={stage.key}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-indigo-50 border-indigo-300 shadow-sm shadow-indigo-600/10'
                      : isPast
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : 'bg-slate-50/60 border-slate-100 opacity-60'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1.5">
                    <div
                      className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-black ${
                        isPast
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                    </div>
                    <span
                      className={`text-xs font-black truncate ${
                        isCurrent
                          ? 'text-indigo-900'
                          : isPast
                          ? 'text-emerald-900'
                          : 'text-slate-500'
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-snug">
                    {stage.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── ETA Tiles ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pickup ETA */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              ESTIMATED TIME TO PICKUP
            </div>
            <div className="text-2xl font-black text-indigo-600 mt-1 font-mono">
              {stageIndex >= 2 ? (
                <span className="text-emerald-600">Patient Secured ✓</span>
              ) : (
                `~${pickupMinutes} min (${pickupKm} km)`
              )}
            </div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Destination Hospital */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              DESTINATION EMERGENCY HOSPITAL
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white mt-1 truncate">
              {hospital.name}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 mt-0.5">
              Trauma Team &amp; Bed Reserved
            </div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        {/* Hospital Total Arrival ETA */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              TOTAL ESTIMATED ARRIVAL
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-1 font-mono">
              ~{pickupMinutes + hospitalMinutes} min
            </div>
            <div className="text-[11px] font-bold text-slate-400 mt-0.5">
              Distance: ~{(pickupKm + hospitalKm).toFixed(1)} km road
            </div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
            <Navigation className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── Live Citizen Tracking Map ──────────────────────────────── */}
      <div className="relative">
        <MapLibreMapView
          ref={mapViewRef}
          center={mapCenter}
          markers={mapMarkers}
          routeCoordinates={routeLine}
          fitMarkersOnLoad
          initialZoom={13}
          className="h-96 sm:h-[480px]"
          alwaysShowModel
        />
        {/* Track Ambulance refocus button */}
        <button
          type="button"
          onClick={() => mapViewRef.current?.flyToAmbulance()}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-colors"
          title="Re-center map on ambulance"
        >
          <Crosshair className="h-4 w-4" />
          Track Ambulance
        </button>
      </div>

      {/* ── Emergency Guidance Notice ──────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-extrabold text-slate-900 text-xs">
            Instructions While Waiting for the Paramedic Unit
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
            Please remain at your coordinates. Keep your phone line clear in case the ambulance crew calls you. If the patient's condition changes or worsens, call <strong>108</strong> immediately.
          </p>
        </div>
      </div>
    </div>
  )
}
