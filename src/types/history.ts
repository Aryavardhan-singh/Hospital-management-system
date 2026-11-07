export type DispatchStatus = 'requested' | 'dispatched' | 'picked_up' | 'completed' | 'diverted' | 'cancelled'
export type ActivityActionType = 'bed_update' | 'er_accepted' | 'er_diverted'
export type UserRole = 'admin' | 'dispatcher' | 'driver' | 'hospital_staff' | 'citizen'

export interface Profile {
  id: string
  email: string
  role: UserRole
  full_name?: string
  phone?: string
  assigned_hospital_id?: string | null
  assigned_ambulance_id?: string | null
  created_at: string
}

export interface DispatchRecord {
  id: string
  created_at: string
  citizen_location_lat?: number | null
  citizen_location_lng?: number | null
  citizen_address?: string | null
  patient_phone?: string | null
  street_landmark?: string | null
  vitals?: string[] | null
  triage_level?: 'critical' | 'moderate' | 'minor' | 'urgent' | 'stable' | null
  assigned_ambulance_id?: string | null
  assigned_driver_id?: string | null
  destination_hospital_id?: string | null
  status: DispatchStatus
  pickup_time?: string | null
  arrival_time?: string | null
  er_acceptance_status?: 'pending' | 'accepted' | 'diverted' | null
}

export interface HospitalActivityLog {
  id: string
  created_at: string
  hospital_id: string
  staff_user_id?: string | null
  action_type: ActivityActionType
  details: Record<string, unknown>
}
