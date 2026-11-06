import React, { useEffect, useState, useMemo } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import { Hospital, Ambulance, DispatchStage } from '@/types'
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
} from 'lucide-react'

export interface CitizenTrackingMapProps {
  citizenLat: number
  citizenLng: number
  ambulance: Ambulance
  hospital: Hospital
  onReset?: () => void
}

// ── Custom Leaflet Icons ─────────────────────────────────────────────────────

const citizenPinIcon = L.divIcon({
  html: `<div style="
    background: #4f46e5;
    border: 3px solid #ffffff;
    border-radius: 50%;
    width: 24px; height: 24px;
    box-shadow: 0 4px 14px rgba(79, 70, 229, 0.6);
    display: flex; align-items: center; justify-content: center;
  "><div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div></div>`,
  className: 'custom-citizen-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -14],
})

const ambulanceMovingIcon = L.divIcon({
  html: `<div style="
    background: #ef4444;
    border: 3px solid #ffffff;
    border-radius: 9999px;
    width: 38px; height: 38px;
    box-shadow: 0 6px 18px rgba(239, 68, 68, 0.6);
    display: flex; align-items: center; justify-content: center;
    color: white;
  ">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.3-.7l-3.72-3.72a1 1 0 0 0-.7-.3H14"/>
      <circle cx="7" cy="18" r="2"/>
      <circle cx="17" cy="18" r="2"/>
      <path d="M7 8h4"/>
      <path d="M9 6v4"/>
    </svg>
  </div>`,
  className: 'custom-ambulance-marker',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -20],
})

const hospitalDestIcon = L.divIcon({
  html: `<div style="
    background: #10b981;
    border: 3px solid #ffffff;
    border-radius: 12px;
    width: 36px; height: 36px;
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.5);
    display: flex; align-items: center; justify-content: center;
    color: white;
  ">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
      <path d="M10 6h4"/>
      <path d="M12 4v4"/>
    </svg>
  </div>`,
  className: 'custom-hospital-marker',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
})

// ── Auto Bounds Controller ───────────────────────────────────────────────────
const AutoBoundsController: React.FC<{
  points: [number, number][]
}> = ({ points }) => {
  const map = useMap()
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
    }
  }, [points, map])
  return null
}

// ── Step Definition ──────────────────────────────────────────────────────────
const STAGES: { key: DispatchStage; label: string; desc: string }[] = [
  { key: 'dispatched', label: 'Ambulance Dispatched', desc: 'Unit assigned and departing depot' },
  { key: 'enroute_pickup', label: 'En Route to You', desc: 'Navigating to your emergency location' },
  { key: 'picked_up', label: 'Patient Picked Up', desc: 'Paramedics on scene and patient secured' },
  { key: 'enroute_hospital', label: 'En Route to Hospital', desc: 'Express transport to emergency department' },
  { key: 'arrived', label: 'Arrived at Facility', desc: 'Transferred to hospital trauma care' },
]

export const CitizenTrackingMap: React.FC<CitizenTrackingMapProps> = ({
  citizenLat,
  citizenLng,
  ambulance,
  hospital,
  onReset,
}) => {
  // Road route coordinates for polyline
  const [routeLine, setRouteLine] = useState<[number, number][]>([])
  const [pickupMinutes, setPickupMinutes] = useState<number>(3)
  const [hospitalMinutes, setHospitalMinutes] = useState<number>(10)
  const [pickupKm, setPickupKm] = useState<number>(1.2)
  const [hospitalKm, setHospitalKm] = useState<number>(4.5)

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

  return (
    <div className="space-y-6 font-sans select-none animate-in fade-in duration-300">
      {/* ── Status Banner & Callout ───────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-[0_4px_24px_-4px_rgba(79,70,229,0.08)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
              <Truck className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Emergency Unit En Route: {ambulance.id}
                </h2>
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
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

            {onReset && (
              <button
                onClick={onReset}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Back to Search
              </button>
            )}
          </div>
        </div>

        {/* ── 5-Step Dispatch Progress Tracker ───────────────────────── */}
        <div className="mt-8 pt-6 border-t border-slate-100">
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
                          : 'bg-slate-200 text-slate-600'
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
                  <p className="text-[11px] font-medium text-slate-500 leading-snug">
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
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
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
          <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Destination Hospital */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              DESTINATION EMERGENCY HOSPITAL
            </div>
            <div className="text-base font-black text-slate-900 mt-1 truncate">
              {hospital.name}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 mt-0.5">
              Trauma Team &amp; Bed Reserved
            </div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        {/* Hospital Total Arrival ETA */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              TOTAL ESTIMATED ARRIVAL
            </div>
            <div className="text-2xl font-black text-slate-800 mt-1 font-mono">
              ~{pickupMinutes + hospitalMinutes} min
            </div>
            <div className="text-[11px] font-bold text-slate-400 mt-0.5">
              Distance: ~{(pickupKm + hospitalKm).toFixed(1)} km road
            </div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Navigation className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── Leaflet Live Tracking Map ──────────────────────────────── */}
      <div className="rounded-[2.5rem] overflow-hidden border border-slate-200/80 shadow-lg h-96 sm:h-[480px] relative z-0">
        <MapContainer
          center={mapCenter}
          zoom={13}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Auto adjust bounds to fit all 3 points */}
          <AutoBoundsController
            points={[
              [ambulance.lat, ambulance.lng],
              [citizenLat, citizenLng],
              [hospital.lat, hospital.lng],
            ]}
          />

          {/* Calculated Road Route Line */}
          {routeLine.length > 1 && (
            <Polyline
              positions={routeLine}
              pathOptions={{
                color: '#4f46e5',
                weight: 5,
                opacity: 0.85,
                lineJoin: 'round',
              }}
            />
          )}

          {/* Citizen Pin */}
          <Circle
            center={[citizenLat, citizenLng]}
            radius={250}
            pathOptions={{
              color: '#4f46e5',
              fillColor: '#4f46e5',
              fillOpacity: 0.1,
              weight: 1.5,
            }}
          />
          <Marker position={[citizenLat, citizenLng]} icon={citizenPinIcon}>
            <Popup>
              <div className="p-1 space-y-1 font-sans">
                <div className="font-black text-xs text-slate-900">Your Location</div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {citizenLat.toFixed(4)}, {citizenLng.toFixed(4)}
                </div>
                <div className="text-[11px] font-extrabold text-indigo-600">
                  Ambulance arriving in ~{pickupMinutes} mins
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Ambulance Moving Marker */}
          <Marker position={[ambulance.lat, ambulance.lng]} icon={ambulanceMovingIcon}>
            <Popup>
              <div className="p-1 space-y-1 font-sans">
                <div className="flex items-center gap-1 font-black text-xs text-slate-900">
                  <Truck className="h-3.5 w-3.5 text-rose-600" />
                  <span>Unit {ambulance.id}</span>
                </div>
                <div className="text-[10px] font-extrabold uppercase text-indigo-600">
                  {currentStage.replace('_', ' ')}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  GPS: {ambulance.lat.toFixed(4)}, {ambulance.lng.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Destination Hospital Marker */}
          <Marker position={[hospital.lat, hospital.lng]} icon={hospitalDestIcon}>
            <Popup>
              <div className="p-1 space-y-1 font-sans">
                <div className="font-black text-xs text-slate-900">{hospital.name}</div>
                <div className="text-[11px] text-slate-500">
                  Available Beds: {Math.max(0, hospital.total_beds - hospital.occupied_beds)}
                </div>
                <div className="text-[10px] font-extrabold text-emerald-600">
                  Destination Hospital
                </div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
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
