import React, { useEffect, useState, useMemo } from 'react'
import { useSupabaseData } from '@/hooks/useSupabaseData'
import { useAmbulanceSimulation } from '@/hooks/useAmbulanceSimulation'
import { rankHospitalsForCitizen, enrichWithRoadRoutes, CitizenHospitalResult } from '@/lib/citizenRouting'
import { CitizenTrackingMap } from '@/components/CitizenTrackingMap'
import { MapLibreMapView, MapLibreMapMarker } from '@/components/MapLibreMapView'
import { getRoadRoute } from '@/lib/osrm'
import { EmergencySeverity, Ambulance as AmbulanceType } from '@/types'
import { DATA_WRITE_ERROR_EVENT } from '@/lib/dataErrors'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { OfflineBanner } from '@/components/OfflineBanner'
import { ThemeToggle } from '@/components/ThemeToggle'
import { PWAUpdateButton } from '@/components/PWAUpdateButton'
import { LanguageToggle } from '@/components/LanguageToggle'
import { useTranslation } from 'react-i18next'
import { reverseGeocode } from '@/lib/geocoding'
import { useDispatchHistory } from '@/hooks/useDispatchHistory'
import { Link } from 'react-router-dom'
import {
  MapPin,
  Ambulance,
  Clock,
  Activity,
  ChevronRight,
  Search,
  AlertTriangle,
  Loader2,
  Navigation,
  Phone,
  ShieldCheck,
  HeartPulse,
  Star,
  LayoutDashboard,
  Truck,
  Building2,
  X,
} from 'lucide-react'

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

function bearingDegrees(startLat: number, startLng: number, endLat: number, endLng: number) {
  const toRadians = (degrees: number) => degrees * Math.PI / 180
  const startLatitude = toRadians(startLat)
  const endLatitude = toRadians(endLat)
  const longitudeDelta = toRadians(endLng - startLng)
  const y = Math.sin(longitudeDelta) * Math.cos(endLatitude)
  const x = Math.cos(startLatitude) * Math.sin(endLatitude) -
    Math.sin(startLatitude) * Math.cos(endLatitude) * Math.cos(longitudeDelta)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

// ─── Component ───────────────────────────────────────────────────────────────
type GeoState = 'requesting' | 'granted' | 'denied' | 'manual'
type DispatchState = 'idle' | 'dispatching' | 'done'

export const PublicPage: React.FC = () => {
  const { t } = useTranslation()
  const { hospitals, ambulances, updateAmbulance, addAmbulances, adjustIcuReservation, queuedCount, isSyncing, flushOfflineQueue } = useSupabaseData()
  const { insertDispatchRecord, updateDispatchRecord } = useDispatchHistory()
  const { isOnline } = useNetworkStatus()
  useAmbulanceSimulation(ambulances, hospitals, updateAmbulance)

  const [geoState, setGeoState] = useState<GeoState>('requesting')
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')

  // Citizen Contact Data & Address
  const [patientPhone, setPatientPhone] = useState('')
  const [streetLandmark, setStreetLandmark] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [activeDispatchId, setActiveDispatchId] = useState<string | null>(null)

  const [roadResults, setRoadResults] = useState<{
    source: CitizenHospitalResult[]
    results: CitizenHospitalResult[]
  } | null>(null)
  const [previewRouteState, setPreviewRouteState] = useState<{
    key: string
    coordinates: [number, number][]
  } | null>(null)
  const [specialty, setSpecialty] = useState('')
  const [severity, setSeverity] = useState<EmergencySeverity>('moderate')

  const [dispatchState, setDispatchState] = useState<DispatchState>('idle')
  const [dispatchedAmbulanceId, setDispatchedAmbulanceId] = useState<string | null>(null)
  const [dataWriteError, setDataWriteError] = useState<string | null>(null)
  const [isStaffMenuOpen, setIsStaffMenuOpen] = useState(false)

  useEffect(() => {
    const handleWriteError = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string }>).detail
      setDataWriteError(detail.message)
    }

    window.addEventListener(DATA_WRITE_ERROR_EVENT, handleWriteError)
    return () => window.removeEventListener(DATA_WRITE_ERROR_EVENT, handleWriteError)
  }, [])

  // ── Geolocation ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      queueMicrotask(() => setGeoState('denied'))
      return
    }

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

  // ── Run ranking whenever location, hospitals, specialty, or severity change ──
  const rankedResults = useMemo(() => {
    if (userLat == null || userLng == null || hospitals.length === 0) return []

    return rankHospitalsForCitizen(
      userLat,
      userLng,
      hospitals,
      specialty.trim() || null,
      3,
      severity
    )
  }, [userLat, userLng, hospitals, specialty, severity])

  const results = roadResults?.source === rankedResults ? roadResults.results : rankedResults
  const nearestAmbulance = useMemo(() => {
    if (ambulances.length === 0) return null
    if (userLat == null || userLng == null) return ambulances[0]
    return ambulances.reduce((nearest, ambulance) => {
      const currentDistance = Math.hypot(
        (ambulance.lat - userLat) * 111,
        (ambulance.lng - userLng) * 111 * Math.cos(userLat * Math.PI / 180)
      )
      const nearestDistance = Math.hypot(
        (nearest.lat - userLat) * 111,
        (nearest.lng - userLng) * 111 * Math.cos(userLat * Math.PI / 180)
      )
      return currentDistance < nearestDistance ? ambulance : nearest
    })
  }, [ambulances, userLat, userLng])
  const topHospital = rankedResults[0]?.hospital
  const topHospitalId = topHospital?.id
  const topHospitalLat = topHospital?.lat
  const topHospitalLng = topHospital?.lng
  const routePreviewKey = userLat != null && userLng != null && topHospitalId
    ? `${topHospitalId}:${userLat}:${userLng}`
    : null
  const previewRoute = previewRouteState?.key === routePreviewKey
    ? previewRouteState.coordinates
    : []

  const mapMarkers = useMemo<MapLibreMapMarker[]>(() => {
    const points: MapLibreMapMarker[] = []
    if (userLat != null && userLng != null) {
      points.push({
        id: 'citizen-location',
        title: 'Your location',
        detail: `${userLat.toFixed(4)}, ${userLng.toFixed(4)}`,
        kind: 'citizen',
        lat: userLat,
        lng: userLng,
      })
    }
    if (nearestAmbulance) {
      const destination = hospitals.find((hospital) => hospital.id === nearestAmbulance.assigned_hospital_id)
      points.push({
        id: `ambulance-${nearestAmbulance.id}`,
        title: `Ambulance ${nearestAmbulance.id}`,
        detail: `${nearestAmbulance.status}${destination ? ` · assigned to ${destination.name}` : ''}`,
        kind: 'ambulance',
        status: nearestAmbulance.status,
        lat: nearestAmbulance.lat,
        lng: nearestAmbulance.lng,
        heading: destination
          ? bearingDegrees(nearestAmbulance.lat, nearestAmbulance.lng, destination.lat, destination.lng)
          : 0,
      })
    }
    results.forEach((result, index) => {
      points.push({
        id: `hospital-${result.hospital.id}`,
        title: result.hospital.name,
        detail: `${result.distanceKm.toFixed(1)} km · ~${result.estMinutes} min · ${result.availabilityLabel}`,
        kind: 'hospital',
        lat: result.hospital.lat,
        lng: result.hospital.lng,
        color: result.availabilityColor,
        rank: index + 1,
      })
    })
    return points
  }, [userLat, userLng, results, nearestAmbulance, hospitals])

  useEffect(() => {
    if (userLat == null || userLng == null || rankedResults.length === 0) return

    // Then enrich asynchronously with real road distances / ETAs from OSRM
    let cancelled = false
    enrichWithRoadRoutes(userLat, userLng, rankedResults).then((enriched) => {
      if (!cancelled) setRoadResults({ source: rankedResults, results: enriched })
    })
    return () => {
      cancelled = true
    }
  }, [userLat, userLng, rankedResults])

  useEffect(() => {
    if (
      userLat == null ||
      userLng == null ||
      topHospitalId == null ||
      topHospitalLat == null ||
      topHospitalLng == null
    ) return undefined

    let cancelled = false
    getRoadRoute([userLat, userLng], [topHospitalLat, topHospitalLng]).then((result) => {
      if (!cancelled) {
        setPreviewRouteState({
          key: `${topHospitalId}:${userLat}:${userLng}`,
          coordinates: result.geometryCoordinates ?? [],
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [userLat, userLng, topHospitalId, topHospitalLat, topHospitalLng])

  // ── Request Ambulance ─────────────────────────────────────────────────────
  const requestAmbulance = async () => {
    if (!results.length || userLat == null || userLng == null) return
    
    // Require contact phone number for real coordination
    if (!patientPhone.trim()) {
      setPhoneError('Please enter your contact phone number so paramedics can reach you.')
      return
    }
    setPhoneError(null)

    const top = results[0]

    setDispatchState('dispatching')
    setDataWriteError(null)

    try {
      let targetAmbulanceId = ''

      // Look for an idle ambulance first
      const idleAmb = ambulances.find((a) => a.status === 'idle')
      if (idleAmb) {
        targetAmbulanceId = idleAmb.id
        await updateAmbulance(idleAmb.id, {
          status: 'enroute',
          assigned_hospital_id: top.hospital.id,
          patient_lat: userLat,
          patient_lng: userLng,
          severity,
          triage_level: severity,
          dispatch_stage: 'enroute_pickup',
          er_status: 'pending',
          patient_condition: `${severity.toUpperCase()} Priority - Citizen Emergency Dispatch`,
        })
      } else {
        // Create or reuse an emergency unit positioned ~1.2km away
        targetAmbulanceId = `AMB-CIT-${Date.now().toString().slice(-4)}`
        const startLat = userLat + 0.012
        const startLng = userLng + 0.011

        const newAmb: AmbulanceType = {
          id: targetAmbulanceId,
          lat: startLat,
          lng: startLng,
          status: 'enroute',
          assigned_hospital_id: top.hospital.id,
          patient_lat: userLat,
          patient_lng: userLng,
          severity,
          triage_level: severity,
          dispatch_stage: 'enroute_pickup',
          er_status: 'pending',
          patient_condition: `${severity.toUpperCase()} Priority - Citizen Emergency Dispatch`,
        }

        await addAmbulances([newAmb])
      }

      // If critical severity, immediately reserve an ICU bed to lock capacity
      if (severity === 'critical') {
        await adjustIcuReservation(top.hospital.id, 1)
      }

      // Reverse geocode citizen coordinates to street address
      const geocodedAddress = await reverseGeocode(userLat, userLng)

      // Store in permanent dispatch_history
      const record = await insertDispatchRecord({
        citizen_location_lat: userLat,
        citizen_location_lng: userLng,
        citizen_address: geocodedAddress,
        patient_phone: patientPhone.trim(),
        street_landmark: streetLandmark.trim() || undefined,
        triage_level: severity,
        assigned_ambulance_id: targetAmbulanceId,
        destination_hospital_id: top.hospital.id,
        status: 'dispatched',
        er_acceptance_status: 'pending',
      })

      if (record) {
        setActiveDispatchId(record.id)
      }

      setDispatchedAmbulanceId(targetAmbulanceId)
      setDispatchState('done')
    } catch (err: any) {
      setDataWriteError(err.message || 'Failed to dispatch ambulance. Please call emergency services.')
      setDispatchState('idle')
    }
  }

  // ── Cancel Dispatch Flow ──────────────────────────────────────────────────
  const handleCancelRequest = async () => {
    if (!dispatchedAmbulanceId) {
      setDispatchState('idle')
      return
    }

    try {
      // 1. Release the ambulance back to idle
      await updateAmbulance(dispatchedAmbulanceId, {
        status: 'idle',
        assigned_hospital_id: null,
        dispatch_stage: undefined,
        er_status: 'pending',
      })

      // 2. Release reserved ICU bed if critical
      if (severity === 'critical' && results[0]?.hospital.id) {
        await adjustIcuReservation(results[0].hospital.id, -1)
      }

      // 3. Mark dispatch record as cancelled
      if (activeDispatchId) {
        await updateDispatchRecord(activeDispatchId, {
          status: 'cancelled',
        })
      }
    } catch (err) {
      console.warn('Error cancelling request:', err)
    } finally {
      setDispatchState('idle')
      setDispatchedAmbulanceId(null)
      setActiveDispatchId(null)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Offline Status Banner */}
      <OfflineBanner
        isOnline={isOnline}
        queuedCount={queuedCount}
        isSyncing={isSyncing}
        onSyncNow={flushOfflineQueue}
      />

      {/* ── Top Nav Bar ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <HeartPulse className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100 leading-none">{t('public.title')}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{t('public.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Language Switcher */}
            <LanguageToggle compact={true} />

            {/* Display / System Settings */}
            <div className="hidden sm:flex items-center gap-1.5">
              <PWAUpdateButton />
              <ThemeToggle />
            </div>

            {/* Staff / Personnel Gateway Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsStaffMenuOpen(!isStaffMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors border border-slate-200/80 dark:border-slate-700 shadow-sm"
                aria-label="Staff Portals and Controls"
                title="Staff & Portals Access"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">Staff Access</span>
                {isStaffMenuOpen ? <X className="h-3 w-3" /> : <ChevronRight className="h-3 w-3 rotate-90" />}
              </button>

              {isStaffMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onClick={() => setIsStaffMenuOpen(false)}
                >
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Emergency Personnel
                  </div>
                  <Link
                    to="/"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4 text-indigo-500" />
                    <div>
                      <div>Command Center</div>
                      <div className="text-[10px] text-slate-400 font-medium">Admin & Network Overview</div>
                    </div>
                  </Link>
                  <Link
                    to="/driver"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Truck className="h-4 w-4 text-blue-500" />
                    <div>
                      <div>Driver Portal</div>
                      <div className="text-[10px] text-slate-400 font-medium">Trip status & past rides</div>
                    </div>
                  </Link>
                  <Link
                    to="/hospital"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Building2 className="h-4 w-4 text-purple-500" />
                    <div>
                      <div>Hospital ER Portal</div>
                      <div className="text-[10px] text-slate-400 font-medium">Incoming feed & bed audit</div>
                    </div>
                  </Link>
                  <div className="sm:hidden pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-2">
                    <span className="text-[10px] text-slate-400 font-bold">Theme</span>
                    <ThemeToggle />
                  </div>
                </div>
              )}
            </div>

            {/* Direct Emergency Call Button */}
            <a
              href="tel:108"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-colors shadow-md shadow-rose-600/20 shrink-0"
            >
              <Phone className="h-3.5 w-3.5" />
              {t('public.call108')}
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {dataWriteError && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {dataWriteError}
          </div>
        )}
        {/* ── Hero Section ─────────────────────────────────────────────── */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-extrabold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('public.badge')}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight">
            Find the Right Hospital,<br />
            <span className="text-indigo-600">Right Now</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-md mx-auto">
            {t('public.heroDesc')}
          </p>
        </div>

        {/* ── Geolocation State ────────────────────────────────────────── */}
        {geoState === 'requesting' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center space-y-3">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mx-auto" />
            <p className="font-extrabold text-slate-800 dark:text-slate-100">{t('public.findingHospitals')}</p>
            <p className="text-slate-500 text-sm">{t('public.allowLocation')}</p>
          </div>
        )}

        {geoState === 'denied' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/60 shadow-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{t('public.locationDenied')}</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {t('public.locationDeniedSub')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase">{t('public.lat')}</label>
                <input
                  type="number"
                  placeholder="e.g. 26.9124"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="w-full mt-1 h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                />
              </div>
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase">{t('public.lng')}</label>
                <input
                  type="number"
                  placeholder="e.g. 75.7873"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  className="w-full mt-1 h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={applyManual}
                className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold transition-colors flex items-center justify-center gap-1.5"
              >
                <Search className="h-4 w-4" /> {t('public.search')}
              </button>
              <button
                onClick={useJaipurCenter}
                className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Navigation className="h-4 w-4" /> {t('public.useJaipur')}
              </button>
            </div>
          </div>
        )}

        {/* ── Specialty filter (shown once we have location) ────────── */}
        {(geoState === 'granted' || geoState === 'manual') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 flex flex-col sm:flex-row items-center gap-3 transition-colors duration-200">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Activity className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-semibold">{t('public.needSpecialty')}</span>
            </div>
            <input
              type="text"
              placeholder={t('public.specialtyPlaceholder')}
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="flex-1 h-10 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400/30 placeholder-slate-400 w-full"
            />
            {specialty && (
              <button
                onClick={() => setSpecialty('')}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* ── {t('public.triageTitle')} Selector ───────────────────── */}
        {(geoState === 'granted' || geoState === 'manual') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 space-y-3 transition-colors duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <HeartPulse className="h-4 w-4 text-rose-500" />
                <span className="text-sm font-extrabold">Emergency Triage Severity</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                Optimizes hospital scoring &amp; bed allocation
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setSeverity('critical')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  severity === 'critical'
                    ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 ring-2 ring-rose-200 dark:ring-rose-800 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-rose-700 uppercase flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    Critical Care
                  </span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-200/60 text-rose-800">
                    ICU Priority
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-snug">
                  Life-threatening: Cardiac arrest, stroke, severe trauma
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSeverity('moderate')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  severity === 'moderate'
                    ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 ring-2 ring-amber-200 dark:ring-amber-800 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Moderate Urgent
                  </span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                    Standard
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-snug">
                  Urgent: Fractures, severe pain, asthma attack, high fever
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSeverity('minor')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  severity === 'minor'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-200 dark:ring-emerald-800 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Minor Standard
                  </span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                    Closest Care
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-snug">
                  Non-urgent: Minor lacerations, sprains, mild dehydration
                </p>
              </button>
            </div>
          </div>
        )}

        {/* ── Map ──────────────────────────────────────────────────────── */}
        {(geoState === 'granted' || geoState === 'manual') && (
          <MapLibreMapView
            center={mapCenter}
            markers={mapMarkers}
            routeCoordinates={previewRoute}
            fitMarkersOnLoad
            initialZoom={12}
            className="h-[420px] sm:h-[500px]"
          />
        )}

        {/* ── Results Cards ─────────────────────────────────────────────── */}
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Recommended Hospitals
              </h2>
              <span className="text-xs font-bold text-slate-400">{t('public.rankedByScore')}</span>
            </div>

            {results.map((r, idx) => (
              <div
                key={r.hospital.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all ${
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
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate">{r.hospital.name}</h3>
                    {idx === 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {t('public.bestMatch')}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{r.reasonText}</p>

                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {/* Distance */}
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                      <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                      {r.distanceKm.toFixed(1)} km away
                    </span>

                    {/* ETA */}
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{t('public.needAmbulance')}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                An ambulance will be dispatched to your location and directed to{' '}
                <strong className="text-slate-800 dark:text-slate-200">{results[0]?.hospital.name}</strong> — the top-recommended facility.
              </p>
            </div>

            {/* Citizen Contact & Street Landmark Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Patient / Caller Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={(e) => {
                    setPatientPhone(e.target.value)
                    if (phoneError) setPhoneError(null)
                  }}
                  placeholder="+91 98290 12345"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
                {phoneError && (
                  <p className="text-[10px] text-rose-500 font-bold mt-1">{phoneError}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Street / Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={streetLandmark}
                  onChange={(e) => setStreetLandmark(e.target.value)}
                  placeholder="Near Ajmeri Gate, Opp Post Office"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            <button
              onClick={requestAmbulance}
              disabled={dispatchState === 'dispatching'}
              className="w-full h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-base font-extrabold transition-all duration-150 shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2.5"
            >
              {dispatchState === 'dispatching' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t('public.dispatching')}
                </>
              ) : (
                <>
                  <Ambulance className="h-5 w-5" />
                  {t('public.requestAmbulance')}
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-slate-400 font-medium">
              For life-threatening emergencies always call <strong>108</strong> immediately.
            </p>
          </div>
        )}

        {/* ── Live Citizen Tracking View ─────────────────────────────── */}
        {dispatchState === 'done' && userLat != null && userLng != null && results[0] && (
          <CitizenTrackingMap
            citizenLat={userLat}
            citizenLng={userLng}
            ambulance={
              ambulances.find((a) => a.id === dispatchedAmbulanceId) || {
                id: dispatchedAmbulanceId || 'AMB-CIT',
                lat: userLat + 0.012,
                lng: userLng + 0.011,
                status: 'enroute',
                assigned_hospital_id: results[0].hospital.id,
                dispatch_stage: 'enroute_pickup',
                patient_lat: userLat,
                patient_lng: userLng,
                severity,
              }
            }
            hospital={results[0].hospital}
            onReset={() => setDispatchState('idle')}
            onCancel={handleCancelRequest}
          />
        )}

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="text-center text-[11px] text-slate-400 font-medium pb-6 space-y-4">
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-center gap-4 text-xs">
            <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">Staff Access Portals:</span>
            <Link to="/" className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1">
              <LayoutDashboard className="h-3 w-3" /> Command Center
            </Link>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <Link to="/driver" className="text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1">
              <Truck className="h-3 w-3" /> Driver Portal
            </Link>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <Link to="/hospital" className="text-purple-600 dark:text-purple-400 hover:underline font-bold flex items-center gap-1">
              <Building2 className="h-3 w-3" /> Hospital ER Portal
            </Link>
          </div>
          <div className="space-y-1">
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
          </div>
        </footer>
      </div>
    </div>
  )
}
