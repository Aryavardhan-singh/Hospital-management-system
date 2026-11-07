import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { HeartPulse, Truck, CheckCircle, Clock, LayoutDashboard, Navigation, MapPin, User, LogOut, Check, Phone, Activity } from 'lucide-react'
import { useDispatchHistory } from '@/hooks/useDispatchHistory'
import { useSupabaseData } from '@/hooks/useSupabaseData'
import { isSupabaseConfigured } from '@/supabaseClient'
import { DispatchRecord } from '@/types/history'
import { ThemeToggle } from '@/components/ThemeToggle'

const QUICK_VITALS = ['Cardiac', 'Breathing Difficulty', 'Severe Trauma', 'Unconscious']

const TRIAGE_BADGE: Record<string, string> = {
  critical: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700/40',
  urgent: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700/40',
  moderate: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40',
  minor: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40',
  stable: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40',
}

const STATUS_BADGE: Record<string, string> = {
  dispatched: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700/40',
  picked_up: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40',
  diverted: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700/40',
  requested: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700',
}

interface DriverProfile {
  id: string
  name: string
  badgeNumber: string
  ambulanceId: string
  contact: string
}

const DRIVER_ROSTER: DriverProfile[] = [
  { id: 'DRV-101', name: 'Rajesh Meena', badgeNumber: 'EMS-JP-409', ambulanceId: 'AMB-101', contact: '+91 98290 12345' },
  { id: 'DRV-102', name: 'Vikram Singh', badgeNumber: 'EMS-JP-312', ambulanceId: 'AMB-102', contact: '+91 98291 54321' },
  { id: 'DRV-103', name: 'Sunil Sharma', badgeNumber: 'EMS-JP-881', ambulanceId: 'AMB-103', contact: '+91 98292 99887' },
  { id: 'DRV-104', name: 'Amit Kumar', badgeNumber: 'EMS-JP-105', ambulanceId: 'AMB-104', contact: '+91 98293 44556' },
]

function formatDuration(startIso: string, endIso: string | null | undefined): string {
  if (!endIso) return '—'
  const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime()
  if (diffMs < 0) return '—'
  const mins = Math.round(diffMs / 60000)
  return `${mins} min`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export const DriverPortalPage: React.FC = () => {
  const isMock = !isSupabaseConfigured()
  const { hospitals } = useSupabaseData()
  const {
    dispatchHistory,
    fetchHistory,
    updateDispatchRecord,
  } = useDispatchHistory()

  const [selectedDriverId, setSelectedDriverId] = useState<string>(() => {
    return localStorage.getItem('mednet_driver_id') || 'DRV-101'
  })
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('mednet_driver_signed_in') === 'true'
  })

  const currentDriver = DRIVER_ROSTER.find(d => d.id === selectedDriverId) || DRIVER_ROSTER[0]
  const selectedAmbulanceId = currentDriver.ambulanceId

  const handleSignIn = (driverId: string) => {
    setSelectedDriverId(driverId)
    setIsLoggedIn(true)
    localStorage.setItem('mednet_driver_id', driverId)
    localStorage.setItem('mednet_driver_signed_in', 'true')
  }

  const handleSignOut = () => {
    setIsLoggedIn(false)
    localStorage.removeItem('mednet_driver_signed_in')
  }

  useEffect(() => {
    void fetchHistory(selectedAmbulanceId)
  }, [selectedAmbulanceId, fetchHistory])

  const myRecords = dispatchHistory.filter(
    r => r.assigned_ambulance_id === selectedAmbulanceId
  )

  const activeTrip: DispatchRecord | undefined = myRecords.find(
    r => r.status === 'dispatched' || r.status === 'picked_up'
  )

  const completedTrips = myRecords.filter(r => r.status === 'completed')

  const getHospital = (id: string | null | undefined) => {
    if (!id) return null
    return hospitals.find(h => h.id === id) || null
  }

  const handleConfirmPickup = async () => {
    if (!activeTrip) return
    await updateDispatchRecord(activeTrip.id, {
      status: 'picked_up',
      pickup_time: new Date().toISOString(),
    })
  }

  const handleArriveAtHospital = async () => {
    if (!activeTrip) return
    await updateDispatchRecord(activeTrip.id, {
      status: 'completed',
      arrival_time: new Date().toISOString(),
    })
  }

  const getGoogleMapsDirectionsUrl = (destLat?: number, destLng?: number) => {
    if (!destLat || !destLng) return '#'
    return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center">
              <Truck className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100 leading-none">Ambulance Driver Station</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Vehicle &amp; Dispatch Terminal</p>
            </div>
            {isMock && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-extrabold border border-amber-200 dark:border-amber-700/40">
                LIVE DEMO
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/find-help"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors border border-rose-200/80 dark:border-rose-800 shadow-sm"
              title="Citizen Help Portal"
            >
              <HeartPulse className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              <span>Citizen Portal</span>
            </Link>

            <Link
              to="/hospital"
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold transition-colors border border-purple-200/80 dark:border-purple-800 shadow-sm"
              title="Hospital ER Portal"
            >
              <span className="text-[11px] font-extrabold">ER Portal</span>
            </Link>

            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors border border-slate-200/80 dark:border-slate-700 shadow-sm"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Command Center</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Driver Authentication / Sign-in Bar */}
        {!isLoggedIn ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Emergency Driver Sign-In</h3>
                <p className="text-xs text-slate-400 font-medium">Select your driver profile to connect with your vehicle and incoming calls</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {DRIVER_ROSTER.map(driver => (
                <button
                  key={driver.id}
                  onClick={() => handleSignIn(driver.id)}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 text-left transition-all duration-150 flex items-center justify-between group"
                >
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{driver.name}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {driver.badgeNumber} · Unit: <span className="font-extrabold text-blue-600 dark:text-blue-400">{driver.ambulanceId}</span>
                    </p>
                  </div>
                  <span className="h-8 px-3 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors">
                    Sign In
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-md shadow-blue-600/20">
                {currentDriver.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">{currentDriver.name}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] font-extrabold">
                    ON-DUTY
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Badge: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{currentDriver.badgeNumber}</span> · Assigned Ambulance: <span className="font-black text-blue-600 dark:text-blue-400">{currentDriver.ambulanceId}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedDriverId}
                onChange={e => handleSignIn(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200"
                aria-label="Switch Driver"
              >
                {DRIVER_ROSTER.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.ambulanceId})</option>
                ))}
              </select>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Current Active Trip with Actionable Target Coordinates */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="h-5 w-5 text-indigo-500" />
              Active Trip &amp; Dispatch Order
            </h2>
            {activeTrip && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                LIVE CALL IN PROGRESS
              </span>
            )}
          </div>

          {activeTrip ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-indigo-200 dark:border-indigo-800/60 shadow-lg space-y-5">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${STATUS_BADGE[activeTrip.status] ?? ''}`}>
                    {activeTrip.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {activeTrip.triage_level && (
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${TRIAGE_BADGE[activeTrip.triage_level] ?? ''}`}>
                      {activeTrip.triage_level.toUpperCase()} PRIORITY
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Order ID: {activeTrip.id.slice(0, 8)}
                </span>
              </div>

              {/* Destination & Pickup Locations with 1-Tap Maps button */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                {/* Patient Pickup Location & Contact Info */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-xs font-extrabold uppercase tracking-wide">
                    <MapPin className="h-3.5 w-3.5" />
                    Patient Pickup Location
                  </div>
                  {activeTrip.citizen_address && (
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {activeTrip.citizen_address}
                    </p>
                  )}
                  {activeTrip.street_landmark && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      Landmark: {activeTrip.street_landmark}
                    </p>
                  )}
                  <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    {activeTrip.citizen_location_lat && activeTrip.citizen_location_lng
                      ? `${activeTrip.citizen_location_lat.toFixed(4)}° N, ${activeTrip.citizen_location_lng.toFixed(4)}° E`
                      : 'Coordinates pending'}
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    {activeTrip.patient_phone && (
                      <a
                        href={`tel:${activeTrip.patient_phone}`}
                        className="inline-flex items-center gap-1 text-xs font-black text-rose-600 dark:text-rose-400 hover:underline"
                      >
                        <Phone className="h-3 w-3" /> Call Patient ({activeTrip.patient_phone})
                      </a>
                    )}
                    {activeTrip.citizen_location_lat && activeTrip.citizen_location_lng && (
                      <a
                        href={getGoogleMapsDirectionsUrl(activeTrip.citizen_location_lat, activeTrip.citizen_location_lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Navigation className="h-3 w-3" /> Maps ↗
                      </a>
                    )}
                  </div>
                </div>

                {/* Destination Hospital */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-extrabold uppercase tracking-wide">
                    <HeartPulse className="h-3.5 w-3.5" />
                    Assigned Hospital ER
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {getHospital(activeTrip.destination_hospital_id)?.name ?? 'Central Trauma Unit'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ER Status: <span className="font-bold uppercase text-emerald-600 dark:text-emerald-400">{activeTrip.er_acceptance_status ?? 'Ready'}</span>
                  </p>
                  {getHospital(activeTrip.destination_hospital_id) && (
                    <a
                      href={getGoogleMapsDirectionsUrl(
                        getHospital(activeTrip.destination_hospital_id)!.lat,
                        getHospital(activeTrip.destination_hospital_id)!.lng
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
                    >
                      <Navigation className="h-3 w-3" /> Route to ER ↗
                    </a>
                  )}
                </div>
              </div>

              {/* Patient Vitals Telemetry Selector */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-rose-500" /> Patient Vitals &amp; Acuity Tags
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Broadcasts instantly to Hospital ER</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_VITALS.map(vital => {
                    const isSelected = activeTrip.vitals?.includes(vital)
                    return (
                      <button
                        key={vital}
                        onClick={async () => {
                          const current = activeTrip.vitals || []
                          const updated = isSelected
                            ? current.filter(v => v !== vital)
                            : [...current, vital]
                          await updateDispatchRecord(activeTrip.id, { vitals: updated })
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {vital} {isSelected ? '✓' : '+'}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Status progression actions */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-3">
                <button
                  onClick={handleConfirmPickup}
                  disabled={activeTrip.status === 'picked_up'}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold transition-all shadow-md shadow-amber-500/20"
                >
                  <Clock className="h-4 w-4" />
                  {activeTrip.status === 'picked_up' ? 'Patient Picked Up ✓' : 'Confirm Patient Picked Up'}
                </button>
                <button
                  onClick={handleArriveAtHospital}
                  disabled={activeTrip.status !== 'picked_up'}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold transition-all shadow-md shadow-emerald-600/20"
                >
                  <CheckCircle className="h-4 w-4" />
                  Complete Run &amp; Arrive at ER
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 text-center">
              <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Unit Idle &amp; Ready for Dispatch</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No active emergency dispatch currently assigned to {currentDriver.ambulanceId}. Any incoming citizen calls will alert here automatically.
              </p>
            </div>
          )}
        </section>

        {/* Trip History */}
        <section>
          <h2 className="text-base font-black text-slate-900 dark:text-white mb-3">Trip History for {currentDriver.ambulanceId}</h2>
          {completedTrips.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-sm font-semibold text-slate-400">No completed trips recorded for this vehicle.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedTrips.map(trip => (
                <div
                  key={trip.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">{trip.assigned_ambulance_id}</span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{formatTime(trip.created_at)}</span>
                    {trip.triage_level && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${TRIAGE_BADGE[trip.triage_level] ?? ''}`}>
                        {trip.triage_level.toUpperCase()}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${STATUS_BADGE[trip.status] ?? ''}`}>
                      {trip.status.toUpperCase()}
                    </span>
                    <span className="ml-auto text-xs font-bold text-slate-500 dark:text-slate-400">
                      Duration: {formatDuration(trip.created_at, trip.arrival_time)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase text-slate-400">Hospital Delivered</p>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{getHospital(trip.destination_hospital_id)?.name ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase text-slate-400">ER Acceptance</p>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">{trip.er_acceptance_status ?? 'Accepted'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
