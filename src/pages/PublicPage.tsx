import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
} from 'react-leaflet'
import L from 'leaflet'
import { supabase, isSupabaseConfigured } from '@/supabaseClient'
import { useSupabaseData } from '@/hooks/useSupabaseData'
import { rankHospitalsForCitizen, CitizenHospitalResult } from '@/lib/citizenRouting'
import {
  MapPin,
  Ambulance,
  Clock,
  Activity,
  ChevronRight,
  Search,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Navigation,
  Phone,
  ShieldCheck,
  HeartPulse,
  Star,
} from 'lucide-react'

// ─── Leaflet icon: citizen pin ────────────────────────────────────────────────
const citizenIcon = L.divIcon({
  html: `<div style="
    background: #4f46e5;
    border: 3px solid #fff;
    border-radius: 50%;
    width: 20px; height: 20px;
    box-shadow: 0 4px 12px rgba(79,70,229,0.5);
  "></div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function hospitalIcon(color: 'green' | 'amber' | 'red', rank: number) {
  const bg = color === 'green' ? '#10b981' : color === 'amber' ? '#f59e0b' : '#f43f5e'
  const border = color === 'green' ? '#059669' : color === 'amber' ? '#d97706' : '#e11d48'
  return L.divIcon({
    html: `<div style="
      background:${bg}; border:3px solid ${border};
      border-radius:10px; width:36px; height:36px;
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 6px 16px rgba(0,0,0,0.22); color:white;
      font-weight:900; font-size:14px; font-family:sans-serif;
    ">${rank}</div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  })
}

// ─── Availability badge ───────────────────────────────────────────────────────
const AVAIL_STYLE = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50  text-amber-700  border-amber-200',
  red:   'bg-rose-50   text-rose-700   border-rose-200',
}

const AVAIL_DOT = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red:   'bg-rose-500',
}

// ─── Jaipur fallback coords ───────────────────────────────────────────────────
const JAIPUR_LAT = 26.9124
const JAIPUR_LNG = 75.7873

// ─── Component ───────────────────────────────────────────────────────────────
type GeoState = 'idle' | 'requesting' | 'granted' | 'denied' | 'manual'
type DispatchState = 'idle' | 'dispatching' | 'done'

export const PublicPage: React.FC = () => {
  const { hospitals } = useSupabaseData()

  const [geoState, setGeoState] = useState<GeoState>('idle')
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')

  const [results, setResults] = useState<CitizenHospitalResult[]>([])
  const [specialty, setSpecialty] = useState('')

  const [dispatchState, setDispatchState] = useState<DispatchState>('idle')
  const [dispatchEta, setDispatchEta] = useState<number | null>(null)
  const [dispatchError, setDispatchError] = useState<string | null>(null)

  // ── Geolocation ───────────────────────────────────────────────────────────
  const requestGeo = useCallback(() => {
    setGeoState('requesting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
        setGeoState('granted')
      },
      () => {
        setGeoState('denied')
      },
      { timeout: 10000 }
    )
  }, [])

  useEffect(() => {
    if (geoState === 'idle') requestGeo()
  }, [geoState, requestGeo])

  // ── Manual location fallback ──────────────────────────────────────────────
  const applyManual = () => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    if (!isNaN(lat) && !isNaN(lng)) {
      setUserLat(lat)
      setUserLng(lng)
      setGeoState('manual')
    }
  }

  const useJaipurCenter = () => {
    setUserLat(JAIPUR_LAT)
    setUserLng(JAIPUR_LNG)
    setGeoState('manual')
  }

  // ── Run ranking whenever location or hospitals change ─────────────────────
  useEffect(() => {
    if (userLat == null || userLng == null || hospitals.length === 0) return
    const ranked = rankHospitalsForCitizen(
      userLat,
      userLng,
      hospitals,
      specialty.trim() || null,
      3
    )
    setResults(ranked)
  }, [userLat, userLng, hospitals, specialty])

  // ── Request Ambulance ─────────────────────────────────────────────────────
  const requestAmbulance = async () => {
    if (!results.length || userLat == null || userLng == null) return
    const top = results[0]

    setDispatchState('dispatching')
    setDispatchError(null)

    try {
      if (isSupabaseConfigured()) {
        // Try to reuse an idle ambulance first
        const { data: idles } = await supabase
          .from('ambulances')
          .select('*')
          .eq('status', 'idle')
          .limit(1)

        if (idles && idles.length > 0) {
          const amb = idles[0]
          await supabase
            .from('ambulances')
            .update({
              lat: userLat,
              lng: userLng,
              status: 'enroute',
              assigned_hospital_id: top.hospital.id,
            })
            .eq('id', amb.id)
        } else {
          // Create a new ambulance row
          const newId = `AMB-CIT-${Date.now().toString().slice(-4)}`
          await supabase.from('ambulances').insert({
            id: newId,
            lat: userLat,
            lng: userLng,
            status: 'enroute',
            assigned_hospital_id: top.hospital.id,
          })
        }
      }
      // In mock mode just simulate success
      setDispatchEta(top.estMinutes)
      setDispatchState('done')
    } catch (err: any) {
      setDispatchError(err.message || 'Failed to dispatch ambulance. Please call emergency services.')
      setDispatchState('idle')
    }
  }

  // ── Map center ────────────────────────────────────────────────────────────
  const mapCenter: [number, number] =
    userLat != null && userLng != null
      ? [userLat, userLng]
      : [JAIPUR_LAT, JAIPUR_LNG]

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 font-sans">
      {/* ── Top Nav Bar ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <HeartPulse className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 leading-none">Jaipur Emergency</p>
              <p className="text-[10px] text-slate-400 font-semibold">City Hospital Network</p>
            </div>
          </div>

          <a
            href="tel:108"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-colors shadow-md shadow-rose-600/20"
          >
            <Phone className="h-3.5 w-3.5" />
            Call 108
          </a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* ── Hero Section ─────────────────────────────────────────────── */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-extrabold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Emergency Hospital Finder
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
            Find the Right Hospital,<br />
            <span className="text-indigo-600">Right Now</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium max-w-md mx-auto">
            We'll find the nearest hospitals with available beds and recommend the best option for you — instantly.
          </p>
        </div>

        {/* ── Geolocation State ────────────────────────────────────────── */}
        {geoState === 'requesting' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center space-y-3">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mx-auto" />
            <p className="font-extrabold text-slate-800">Finding hospitals near you…</p>
            <p className="text-slate-500 text-sm">Please allow location access when prompted.</p>
          </div>
        )}

        {geoState === 'denied' && (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-slate-800 text-sm">Location access denied</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Enter your coordinates manually, or use the Jaipur city centre as a reference.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase">Latitude</label>
                <input
                  type="number"
                  placeholder="e.g. 26.9124"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="w-full mt-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                />
              </div>
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase">Longitude</label>
                <input
                  type="number"
                  placeholder="e.g. 75.7873"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  className="w-full mt-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={applyManual}
                className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold transition-colors flex items-center justify-center gap-1.5"
              >
                <Search className="h-4 w-4" /> Search
              </button>
              <button
                onClick={useJaipurCenter}
                className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Navigation className="h-4 w-4" /> Use Jaipur Centre
              </button>
            </div>
          </div>
        )}

        {/* ── Specialty filter (shown once we have location) ────────── */}
        {(geoState === 'granted' || geoState === 'manual') && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 text-slate-500">
              <Activity className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-semibold">Need a specific specialty?</span>
            </div>
            <input
              type="text"
              placeholder="e.g. Cardiology, Trauma, Pediatrics…"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="flex-1 h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400/30 placeholder-slate-300 w-full"
            />
            {specialty && (
              <button
                onClick={() => setSpecialty('')}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* ── Map ──────────────────────────────────────────────────────── */}
        {(geoState === 'granted' || geoState === 'manual') && (
          <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-md h-64 sm:h-80 relative z-0">
            <MapContainer
              center={mapCenter}
              zoom={12}
              scrollWheelZoom={false}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Citizen location marker + accuracy circle */}
              {userLat != null && userLng != null && (
                <>
                  <Circle
                    center={[userLat, userLng]}
                    radius={300}
                    pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.08, weight: 1.5 }}
                  />
                  <Marker position={[userLat, userLng]} icon={citizenIcon}>
                    <Popup>
                      <div className="text-xs font-bold text-slate-800">Your Location</div>
                      <div className="text-[11px] text-slate-500 font-mono">{userLat.toFixed(4)}, {userLng.toFixed(4)}</div>
                    </Popup>
                  </Marker>
                </>
              )}

              {/* Hospital markers */}
              {results.map((r, idx) => (
                <Marker
                  key={r.hospital.id}
                  position={[r.hospital.lat, r.hospital.lng]}
                  icon={hospitalIcon(r.availabilityColor, idx + 1)}
                >
                  <Popup>
                    <div className="text-xs space-y-1 w-44 font-sans">
                      <div className="font-extrabold text-slate-900">{r.hospital.name}</div>
                      <div className="text-slate-500">{r.distanceKm.toFixed(1)} km · ~{r.estMinutes} min</div>
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${AVAIL_STYLE[r.availabilityColor]}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${AVAIL_DOT[r.availabilityColor]}`} />
                        {r.availabilityLabel}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {/* ── Results Cards ─────────────────────────────────────────────── */}
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">
                Recommended Hospitals
              </h2>
              <span className="text-xs font-bold text-slate-400">Ranked by smart routing score</span>
            </div>

            {results.map((r, idx) => (
              <div
                key={r.hospital.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all ${
                  idx === 0
                    ? 'border-indigo-200 ring-2 ring-indigo-100'
                    : 'border-slate-100 hover:shadow-md'
                }`}
              >
                {/* Rank badge */}
                <div
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0 shadow-md ${
                    idx === 0
                      ? 'bg-indigo-600 shadow-indigo-600/25'
                      : idx === 1
                      ? 'bg-slate-500 shadow-slate-400/20'
                      : 'bg-slate-300 shadow-none'
                  }`}
                >
                  {idx === 0 ? <Star className="h-5 w-5" /> : idx + 1}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-base font-extrabold text-slate-900 truncate">{r.hospital.name}</h3>
                    {idx === 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        BEST MATCH
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{r.reasonText}</p>

                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {/* Distance */}
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-600">
                      <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                      {r.distanceKm.toFixed(1)} km away
                    </span>

                    {/* ETA */}
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      ~{r.estMinutes} min
                    </span>

                    {/* Availability */}
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${AVAIL_STYLE[r.availabilityColor]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${AVAIL_DOT[r.availabilityColor]}`} />
                      {r.availabilityLabel}
                    </span>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-slate-300 shrink-0 hidden sm:block" />
              </div>
            ))}
          </div>
        )}

        {/* ── Emergency Dispatch Button / Confirmation ──────────────── */}
        {results.length > 0 && dispatchState !== 'done' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Need an Ambulance?</h2>
              <p className="text-sm text-slate-500 mt-1">
                An ambulance will be dispatched to your location and directed to{' '}
                <strong className="text-slate-800">{results[0]?.hospital.name}</strong> — the top-recommended facility.
              </p>
            </div>

            {dispatchError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {dispatchError}
              </div>
            )}

            <button
              onClick={requestAmbulance}
              disabled={dispatchState === 'dispatching'}
              className="w-full h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-base font-extrabold transition-all duration-150 shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2.5"
            >
              {dispatchState === 'dispatching' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Dispatching Ambulance…
                </>
              ) : (
                <>
                  <Ambulance className="h-5 w-5" />
                  Request Emergency Ambulance
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-slate-400 font-medium">
              For life-threatening emergencies always call <strong>108</strong> immediately.
            </p>
          </div>
        )}

        {/* ── Dispatch Confirmation ─────────────────────────────────── */}
        {dispatchState === 'done' && dispatchEta != null && (
          <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Ambulance Dispatched</h2>
              <p className="text-slate-500 text-sm mt-1.5 max-w-sm mx-auto">
                An emergency unit is on its way to your location, heading to{' '}
                <strong className="text-slate-800">{results[0]?.hospital.name}</strong>.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-50 border border-indigo-100">
              <Clock className="h-5 w-5 text-indigo-600" />
              <span className="text-lg font-black text-indigo-700">
                Estimated arrival: ~{dispatchEta} minutes
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-medium">
              Stay at your location. Track the ambulance live on the{' '}
              <a href="/" className="text-indigo-600 font-extrabold underline underline-offset-2">admin dashboard</a>.
            </p>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="text-center text-[11px] text-slate-400 font-medium pb-6 space-y-1">
          <p>Jaipur City Hospital Emergency Network · Powered by real-time Supabase telemetry</p>
          <p>
            For emergencies call{' '}
            <a href="tel:108" className="text-rose-600 font-extrabold">108</a>
            {' '}(ambulance) ·{' '}
            <a href="tel:100" className="text-rose-600 font-extrabold">100</a>
            {' '}(police) ·{' '}
            <a href="tel:101" className="text-rose-600 font-extrabold">101</a>
            {' '}(fire)
          </p>
        </footer>
      </div>
    </div>
  )
}
