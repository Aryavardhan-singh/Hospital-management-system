import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Building2, HeartPulse, Truck, CheckCircle, XCircle, LayoutDashboard, AlertTriangle } from 'lucide-react'
import { useDispatchHistory } from '@/hooks/useDispatchHistory'
import { useSupabaseData } from '@/hooks/useSupabaseData'
import { isSupabaseConfigured } from '@/supabaseClient'
import { DispatchRecord, HospitalActivityLog } from '@/types/history'
import { ThemeToggle } from '@/components/ThemeToggle'

const TRIAGE_BADGE: Record<string, string> = {
  critical: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700/40',
  urgent: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700/40',
  moderate: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40',
  minor: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40',
  stable: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40',
}

const ACTION_BADGE: Record<string, string> = {
  bed_update: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40',
  er_accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40',
  er_diverted: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatDetails(details: Record<string, unknown>): string {
  return Object.entries(details)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(' · ')
}

export const HospitalPortalPage: React.FC = () => {
  const isMock = !isSupabaseConfigured()
  const { hospitals } = useSupabaseData()
  const {
    dispatchHistory,
    activityLogs,
    fetchHistory,
    fetchActivityLogs,
    updateDispatchRecord,
    logHospitalActivity,
  } = useDispatchHistory()

  const [selectedHospitalIdState, setSelectedHospitalId] = useState<string>('')
  const selectedHospitalId = selectedHospitalIdState || (hospitals.length > 0 ? hospitals[0].id : '')
  const [activePortalTab, setActivePortalTab] = useState<'incoming' | 'activity'>('incoming')

  useEffect(() => {
    if (selectedHospitalId) {
      void fetchHistory(undefined, selectedHospitalId)
      void fetchActivityLogs(selectedHospitalId)
    }
  }, [selectedHospitalId, fetchHistory, fetchActivityLogs])

  const incomingAmbulances: DispatchRecord[] = dispatchHistory.filter(
    r =>
      r.destination_hospital_id === selectedHospitalId &&
      (r.status === 'dispatched' || r.status === 'picked_up')
  )

  const myActivityLogs: HospitalActivityLog[] = activityLogs.filter(
    l => l.hospital_id === selectedHospitalId
  )

  const handleAccept = async (record: DispatchRecord) => {
    await updateDispatchRecord(record.id, { er_acceptance_status: 'accepted' })
    await logHospitalActivity(selectedHospitalId, 'er_accepted', {
      ambulance_id: record.assigned_ambulance_id,
      patient_triage: record.triage_level,
    })
  }

  const handleDivert = async (record: DispatchRecord) => {
    await updateDispatchRecord(record.id, { status: 'diverted', er_acceptance_status: 'diverted' })
    await logHospitalActivity(selectedHospitalId, 'er_diverted', {
      ambulance_id: record.assigned_ambulance_id,
      patient_triage: record.triage_level,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100 leading-none">Hospital ER Portal</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Incoming Ambulances &amp; Activity Log</p>
            </div>
            {isMock && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-extrabold border border-amber-200 dark:border-amber-700/40">
                DEMO MODE
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
              to="/driver"
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold transition-colors border border-blue-200/80 dark:border-blue-800 shadow-sm"
              title="Driver Portal"
            >
              <Truck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-[11px] font-extrabold">Driver</span>
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
        {/* Hospital Selector */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
          <label className="block text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
            Select Hospital
          </label>
          <select
            value={selectedHospitalId}
            onChange={e => setSelectedHospitalId(e.target.value)}
            className="w-full md:w-80 px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {hospitals.length > 0 ? (
              hospitals.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))
            ) : (
              <option value="11111111-1111-1111-1111-111111111111">SMS Hospital (Demo)</option>
            )}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActivePortalTab('incoming')}
            className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activePortalTab === 'incoming'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Incoming Ambulances
            {incomingAmbulances.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold">
                {incomingAmbulances.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActivePortalTab('activity')}
            className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activePortalTab === 'activity'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Activity Log
          </button>
        </div>

        {/* Tab: Incoming Ambulances */}
        {activePortalTab === 'incoming' && (
          <section>
            {incomingAmbulances.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 text-center">
                <HeartPulse className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No incoming ambulances at this time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incomingAmbulances.map(record => (
                  <div
                    key={record.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3"
                  >
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                          {record.assigned_ambulance_id ?? 'Unknown Ambulance'}
                        </span>
                        {record.triage_level && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${TRIAGE_BADGE[record.triage_level] ?? ''}`}>
                            {record.triage_level.toUpperCase()}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-slate-400">
                          {record.status.replace('_', ' ')} · dispatched {formatTime(record.created_at)}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        record.er_acceptance_status === 'accepted'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40'
                          : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}>
                        ER: {record.er_acceptance_status ?? 'pending'}
                      </span>
                    </div>
                    {record.pickup_time && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Picked up at {formatTime(record.pickup_time)}
                      </p>
                    )}

                    {/* Vitals & High-Priority Tags Telemetry */}
                    {record.vitals && record.vitals.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">Vitals Telemetry:</span>
                        {record.vitals.map(vital => (
                          <span
                            key={vital}
                            className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 animate-pulse"
                          >
                            ⚠️ {vital}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Patient Phone & Geocoded Address */}
                    {(record.citizen_address || record.patient_phone) && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                        {record.citizen_address && <div>Location: <span className="font-semibold text-slate-700 dark:text-slate-200">{record.citizen_address}</span></div>}
                        {record.patient_phone && <div>Caller: <span className="font-semibold text-slate-700 dark:text-slate-200">{record.patient_phone}</span></div>}
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleAccept(record)}
                        disabled={record.er_acceptance_status === 'accepted'}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold transition-colors shadow-sm"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleDivert(record)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-extrabold transition-colors border border-rose-200 dark:border-rose-700/40"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Divert
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab: Activity Log */}
        {activePortalTab === 'activity' && (
          <section>
            {myActivityLogs.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 text-center">
                <AlertTriangle className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No activity logged for this hospital.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myActivityLogs.map(log => (
                  <div
                    key={log.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl px-5 py-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-start gap-3"
                  >
                    <span className={`mt-0.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border shrink-0 ${ACTION_BADGE[log.action_type] ?? ''}`}>
                      {log.action_type.replace('_', ' ').toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {formatDetails(log.details)}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{formatTime(log.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
