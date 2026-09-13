import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Hospital, Ambulance } from '@/types'
import { Building2, Truck, Activity, HeartPulse } from 'lucide-react'

// Center point: Jaipur coordinates (26.9124, 75.7873)
const JAIPUR_CENTER: [number, number] = [26.9124, 75.7873]
const JAIPUR_ZOOM = 12.5

interface DispatchMapProps {
  hospitals: Hospital[]
  ambulances: Ambulance[]
  selectedAmbulanceId?: string | null
}

// Component to dynamically pan map when an ambulance or hospital is selected
const MapController: React.FC<{ selectedAmbulance: Ambulance | null }> = ({
  selectedAmbulance,
}) => {
  const map = useMap()
  useEffect(() => {
    if (selectedAmbulance) {
      map.flyTo([selectedAmbulance.lat, selectedAmbulance.lng], 14, {
        duration: 1.5,
      })
    }
  }, [selectedAmbulance, map])
  return null
}

// Create custom SVG HTML divIcon for Hospitals
function createHospitalIcon(occupancyRate: number) {
  let bgColor = '#10b981' // Green
  let borderColor = '#059669'

  if (occupancyRate > 90) {
    bgColor = '#f43f5e' // Red
    borderColor = '#e11d48'
  } else if (occupancyRate >= 70) {
    bgColor = '#f59e0b' // Yellow
    borderColor = '#d97706'
  }

  const svgHtml = `
    <div style="
      background-color: ${bgColor};
      border: 3px solid ${borderColor};
      width: 38px;
      height: 38px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 16px rgba(0,0,0,0.25);
      color: white;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
        <path d="M10 6h4"/>
        <path d="M12 4v4"/>
      </svg>
    </div>
  `

  return L.divIcon({
    html: svgHtml,
    className: 'custom-hospital-marker',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
  })
}

// Create custom SVG HTML divIcon for Ambulances
function createAmbulanceIcon(status: string) {
  let bgColor = '#64748b' // Idle = Gray
  let borderColor = '#475569'

  if (status === 'occupied') {
    bgColor = '#f97316' // Occupied = Orange
    borderColor = '#ea580c'
  } else if (status === 'enroute') {
    bgColor = '#3b82f6' // En Route = Blue
    borderColor = '#2563eb'
  }

  const svgHtml = `
    <div style="
      background-color: ${bgColor};
      border: 3px solid ${borderColor};
      width: 34px;
      height: 34px;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 14px rgba(0,0,0,0.3);
      color: white;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.3-.7l-3.72-3.72a1 1 0 0 0-.7-.3H14"/>
        <circle cx="7" cy="18" r="2"/>
        <circle cx="17" cy="18" r="2"/>
        <path d="M7 8h4"/>
        <path d="M9 6v4"/>
      </svg>
    </div>
  `

  return L.divIcon({
    html: svgHtml,
    className: 'custom-ambulance-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  })
}

export const DispatchMap: React.FC<DispatchMapProps> = ({
  hospitals,
  ambulances,
  selectedAmbulanceId,
}) => {
  const activeAmbulance = ambulances.find((a) => a.id === selectedAmbulanceId) || null

  return (
    <div className="h-full w-full rounded-3xl overflow-hidden border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] relative z-0">
      <MapContainer
        center={JAIPUR_CENTER}
        zoom={JAIPUR_ZOOM}
        scrollWheelZoom={true}
        className="h-full w-full select-none"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController selectedAmbulance={activeAmbulance} />

        {/* Hospital Markers */}
        {hospitals.map((hospital) => {
          const occupancyRate =
            hospital.total_beds > 0 ? (hospital.occupied_beds / hospital.total_beds) * 100 : 0

          return (
            <Marker
              key={hospital.id}
              position={[hospital.lat, hospital.lng]}
              icon={createHospitalIcon(occupancyRate)}
            >
              <Popup>
                <div className="p-2 space-y-2 font-sans w-52">
                  <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                    <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
                    <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                      {hospital.name}
                    </h4>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1 font-semibold">
                        <Activity className="h-3.5 w-3.5 text-indigo-600" /> General Beds:
                      </span>
                      <span className="font-extrabold text-slate-900 font-mono">
                        {hospital.occupied_beds} / {hospital.total_beds}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1 font-semibold">
                        <HeartPulse className="h-3.5 w-3.5 text-rose-500" /> ICU Capacity:
                      </span>
                      <span className="font-extrabold text-slate-900 font-mono">
                        {hospital.icu_occupied} / {hospital.icu_beds}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1.5 flex justify-between items-center text-[10px] text-slate-400 font-extrabold uppercase">
                    <span>STATUS</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-black ${
                        occupancyRate > 90
                          ? 'bg-rose-100 text-rose-700'
                          : occupancyRate >= 70
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {Math.round(occupancyRate)}% CAPACITY
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Ambulance Markers */}
        {ambulances.map((amb) => {
          const assignedHospital = hospitals.find((h) => h.id === amb.assigned_hospital_id)

          return (
            <Marker
              key={amb.id}
              position={[amb.lat, amb.lng]}
              icon={createAmbulanceIcon(amb.status)}
            >
              <Popup>
                <div className="p-2 space-y-2 font-sans w-52">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center space-x-2">
                      <Truck className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span className="font-black text-sm text-slate-900">{amb.id}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        amb.status === 'occupied'
                          ? 'bg-orange-100 text-orange-700'
                          : amb.status === 'enroute'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {amb.status}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="text-[10px] text-slate-400 font-extrabold uppercase">
                      ASSIGNED HOSPITAL
                    </div>
                    <div className="font-extrabold text-slate-800">
                      {assignedHospital ? assignedHospital.name : 'Unassigned / Staged'}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
