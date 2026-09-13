export interface Hospital {
  id: string
  name: string
  lat: number
  lng: number
  total_beds: number
  occupied_beds: number
  icu_beds: number
  icu_occupied: number
  specialties: string[]
  status: 'operational' | 'busy' | 'critical'
  created_at?: string
}

export interface Ambulance {
  id: string
  lat: number
  lng: number
  status: 'idle' | 'enroute' | 'occupied'
  assigned_hospital_id: string | null
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
