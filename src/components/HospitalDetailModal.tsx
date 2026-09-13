import React from 'react'
import { Hospital, Ambulance } from '@/types'
import { Button } from './ui/button'
import {
  X,
  Building2,
  MapPin,
  Activity,
  HeartPulse,
  Truck,
  Stethoscope,
  UserPlus,
  UserMinus,
  CheckCircle2,
  Radio,
  Navigation,
  Zap,
} from 'lucide-react'

interface HospitalDetailModalProps {
  hospital: Hospital | null
  ambulances: Ambulance[]
  isLive: boolean
  onClose: () => void
  onUpdateOccupancy: (hospitalId: string, delta: number) => void
  onCapacityCrisis?: (hospitalId: string) => void
}

export const HospitalDetailModal: React.FC<HospitalDetailModalProps> = ({
  hospital,
  ambulances,
  isLive,
  onClose,
  onUpdateOccupancy,
  onCapacityCrisis,
}) => {
  if (!hospital) return null

  const occupancyRate = hospital.total_beds > 0
    ? (hospital.occupied_beds / hospital.total_beds) * 100
    : 0

  const icuOccupancyRate = hospital.icu_beds > 0
    ? (hospital.icu_occupied / hospital.icu_beds) * 100
    : 0

  const availableBeds = Math.max(0, hospital.total_beds - hospital.occupied_beds)

  // Find ambulances assigned to this hospital
  const assignedAmbulances = ambulances.filter(
    (a) => a.assigned_hospital_id === hospital.id
  )

  let statusBadgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200'
  let statusText = 'NORMAL'
  let barColor = 'bg-emerald-500'

  if (occupancyRate > 90) {
    statusBadgeBg = 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
    statusText = 'CRITICAL (>90%)'
    barColor = 'bg-rose-500'
  } else if (occupancyRate >= 70) {
    statusBadgeBg = 'bg-amber-50 text-amber-700 border-amber-200'
    statusText = 'BUSY (70-90%)'
    barColor = 'bg-amber-500'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {hospital.name}
                </h2>
                <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${statusBadgeBg}`}>
                  {statusText}
                </span>
              </div>
              <p className="flex items-center space-x-1 text-xs font-semibold text-slate-400 mt-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  Location Coordinates: {hospital.lat.toFixed(4)}, {hospital.lng.toFixed(4)}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-10 w-10 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body Scroll Area */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 font-sans">
          {/* Real-time Demo Testing Banner */}
          <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                <Radio className="h-4 w-4 text-indigo-600 animate-pulse" />
                Real-time Database Controls (Demo)
              </h4>
              <p className="text-[11px] text-indigo-700 font-medium mt-0.5">
                Simulate admissions or discharges to update Supabase in real-time.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateOccupancy(hospital.id, -1)}
                disabled={hospital.occupied_beds <= 0}
                className="h-9 px-3 rounded-xl bg-white border-slate-200 text-slate-800 hover:bg-slate-100 font-bold text-xs space-x-1"
              >
                <UserMinus className="h-3.5 w-3.5 text-rose-500" />
                <span>Discharge (-1)</span>
              </Button>

              <Button
                size="sm"
                onClick={() => onUpdateOccupancy(hospital.id, 1)}
                disabled={hospital.occupied_beds >= hospital.total_beds}
                className="h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 space-x-1 border-none"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Admit (+1)</span>
              </Button>
            </div>
          </div>

          {/* DEMO: Capacity Crisis Button */}
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-extrabold text-rose-900 flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-rose-600" />
                Demo: Simulate Capacity Crisis
              </h4>
              <p className="text-[11px] text-rose-700 font-medium mt-0.5">
                Instantly fills all beds to 100% — triggers auto-diversion for en-route ambulances.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => onCapacityCrisis?.(hospital.id)}
              disabled={hospital.occupied_beds >= hospital.total_beds}
              className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 border-none shrink-0 space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>⚡ Force Capacity Crisis</span>
            </Button>
          </div>

          {/* Full Bed Capacity Breakdown */}
          <div>
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3">
              Full Capacity & Ward Breakdown
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Box 1: General Beds */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5 text-indigo-600" /> GENERAL BEDS
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  {hospital.occupied_beds} <span className="text-sm font-bold text-slate-400">/ {hospital.total_beds}</span>
                </div>
                <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                  {Math.round(occupancyRate)}% Occupied
                </div>
              </div>

              {/* Box 2: ICU Capacity */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <HeartPulse className="h-3.5 w-3.5 text-rose-500" /> ICU CAPACITY
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  {hospital.icu_occupied} <span className="text-sm font-bold text-slate-400">/ {hospital.icu_beds}</span>
                </div>
                <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                  {Math.round(icuOccupancyRate)}% Occupied
                </div>
              </div>

              {/* Box 3: Available Beds */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <div className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> AVAILABLE NOW
                </div>
                <div className="text-2xl font-black text-emerald-800 mt-1 font-mono">
                  {availableBeds} <span className="text-sm font-bold text-emerald-600">Beds</span>
                </div>
                <div className="text-[11px] font-bold text-emerald-700 mt-0.5">
                  Ready for Emergency Patients
                </div>
              </div>
            </div>
          </div>

          {/* Full Specialty List */}
          <div>
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5 text-slate-400" /> Full Specialties & Medical Departments
            </h3>
            <div className="flex flex-wrap gap-2">
              {hospital.specialties.map((spec, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-100 text-slate-800 border border-slate-200/80"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>

          {/* Assigned Emergency Ambulances Section */}
          <div>
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-indigo-600" /> Assigned Emergency Fleet ({assignedAmbulances.length})
            </h3>

            {assignedAmbulances.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {assignedAmbulances.map((amb) => (
                  <div
                    key={amb.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <Truck className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900">{amb.id}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {amb.lat.toFixed(4)}, {amb.lng.toFixed(4)}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        amb.status === 'occupied'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {amb.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400 flex items-center justify-center gap-2 italic">
                <Navigation className="h-4 w-4 text-slate-400" />
                <span>No active emergency ambulances assigned to this facility right now.</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 md:px-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-slate-400">ID: {hospital.id}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl border-slate-200 text-slate-700 font-bold px-5"
          >
            Close Detail View
          </Button>
        </div>
      </div>
    </div>
  )
}
