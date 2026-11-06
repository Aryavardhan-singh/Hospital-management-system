export interface Hospital {
  id: string
  name: string
  lat: number
  lng: number
  total_beds: number
  occupied_beds: number
  icu_beds: number
  icu_occupied: number
  icuBedsTotal: number
  icuBedsAvailable: number
  ventilatorsAvailable: number
  oxygenStatus: 'sufficient' | 'low' | 'critical'
  bloodTypesAvailable?: string[]
  specialties: string[]
  status: 'operational' | 'busy' | 'critical'
  created_at?: string
}

export type ErStatus = 'pending' | 'accepted' | 'diverted'
export type EmergencySeverity = 'critical' | 'moderate' | 'minor'
export type TriageLevel = 'critical' | 'moderate' | 'minor' | 'urgent' | 'stable'
export type DispatchStage =
  | 'dispatched'
  | 'enroute_pickup'
  | 'picked_up'
  | 'enroute_hospital'
  | 'arrived'

export interface Ambulance {
  id: string
  lat: number
  lng: number
  status: 'idle' | 'enroute' | 'occupied'
  assigned_hospital_id: string | null
  er_status?: ErStatus
  erStatus?: ErStatus
  patient_condition?: string
  triage_level?: TriageLevel
  severity?: EmergencySeverity
  dispatch_stage?: DispatchStage
  patient_lat?: number
  patient_lng?: number
  created_at?: string
}

export type CapacityLevel = 'good' | 'warning' | 'critical'

export function getCapacityLevel(occupied: number, total: number): CapacityLevel {
  if (total <= 0) return 'good'
  const percentage = (occupied / total) * 100
  if (percentage >= 90) return 'critical'
  if (percentage >= 75) return 'warning'
  return 'good'
}
