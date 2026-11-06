import { useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/supabaseClient'
import { Hospital, Ambulance } from '@/types'

const MOCK_HOSPITALS: Hospital[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'SMS Hospital',
    lat: 26.9124,
    lng: 75.807,
    total_beds: 250,
    occupied_beds: 228,
    icu_beds: 45,
    icu_occupied: 42,
    icuBedsTotal: 45,
    icuBedsAvailable: 3,
    ventilatorsAvailable: 12,
    oxygenStatus: 'sufficient',
    bloodTypesAvailable: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+'],
    specialties: ['Trauma', 'Cardiology', 'Oncology'],
    status: 'operational',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Fortis Escorts Hospital',
    lat: 26.8656,
    lng: 75.808,
    total_beds: 180,
    occupied_beds: 135,
    icu_beds: 30,
    icu_occupied: 21,
    icuBedsTotal: 30,
    icuBedsAvailable: 9,
    ventilatorsAvailable: 8,
    oxygenStatus: 'sufficient',
    bloodTypesAvailable: ['A+', 'B+', 'O+', 'AB+'],
    specialties: ['Cardiology', 'Neurology', 'Orthopaedics', 'Oncology'],
    status: 'operational',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Narayana Multispeciality Hospital',
    lat: 26.81,
    lng: 75.797,
    total_beds: 160,
    occupied_beds: 148,
    icu_beds: 35,
    icu_occupied: 33,
    icuBedsTotal: 35,
    icuBedsAvailable: 2,
    ventilatorsAvailable: 4,
    oxygenStatus: 'low',
    bloodTypesAvailable: ['B+', 'O+', 'O-'],
    specialties: ['Cardiology', 'Oncology', 'Gastroenterology', 'Transplants'],
    status: 'busy',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Manipal Hospital Jaipur',
    lat: 26.858,
    lng: 75.813,
    total_beds: 140,
    occupied_beds: 84,
    icu_beds: 25,
    icu_occupied: 10,
    icuBedsTotal: 25,
    icuBedsAvailable: 15,
    ventilatorsAvailable: 10,
    oxygenStatus: 'sufficient',
    bloodTypesAvailable: ['A+', 'B+', 'O+', 'O-', 'AB-', 'AB+'],
    specialties: ['Multi-speciality', 'Critical Care'],
    status: 'operational',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'JK Lone Hospital',
    lat: 26.913,
    lng: 75.806,
    total_beds: 190,
    occupied_beds: 182,
    icu_beds: 30,
    icu_occupied: 28,
    icuBedsTotal: 30,
    icuBedsAvailable: 2,
    ventilatorsAvailable: 1,
    oxygenStatus: 'critical',
    bloodTypesAvailable: ['A+', 'B+', 'O+'],
    specialties: ['Pediatrics', 'NICU', 'PICU'],
    status: 'critical',
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    name: 'Mahila Chikitsalaya',
    lat: 26.9115,
    lng: 75.8065,
    total_beds: 150,
    occupied_beds: 95,
    icu_beds: 20,
    icu_occupied: 11,
    icuBedsTotal: 20,
    icuBedsAvailable: 9,
    ventilatorsAvailable: 5,
    oxygenStatus: 'sufficient',
    bloodTypesAvailable: ['A+', 'B+', 'B-', 'O+'],
    specialties: ['Obstetrics', 'Gynaecology', 'High-risk pregnancy'],
    status: 'operational',
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    name: 'Apex Hospital',
    lat: 26.859,
    lng: 75.814,
    total_beds: 90,
    occupied_beds: 42,
    icu_beds: 12,
    icu_occupied: 3,
    icuBedsTotal: 12,
    icuBedsAvailable: 9,
    ventilatorsAvailable: 6,
    oxygenStatus: 'sufficient',
    bloodTypesAvailable: ['A+', 'O+'],
    specialties: ['General', 'Emergency Care'],
    status: 'operational',
  },
]

const MOCK_AMBULANCES: Ambulance[] = [
  {
    id: 'AMB-101',
    lat: 26.908,
    lng: 75.805,
    status: 'occupied',
    assigned_hospital_id: '11111111-1111-1111-1111-111111111111',
    er_status: 'accepted',
    erStatus: 'accepted',
    patient_condition: 'Polytrauma - Vehicular collision, conscious',
    triage_level: 'urgent',
  },
  {
    id: 'AMB-102',
    lat: 26.862,
    lng: 75.809,
    status: 'enroute',
    assigned_hospital_id: '22222222-2222-2222-2222-222222222222',
    er_status: 'pending',
    erStatus: 'pending',
    patient_condition: 'Suspected STEMI / Acute coronary syndrome',
    triage_level: 'critical',
  },
  {
    id: 'AMB-103',
    lat: 26.856,
    lng: 75.812,
    status: 'idle',
    assigned_hospital_id: null,
  },
  {
    id: 'AMB-104',
    lat: 26.808,
    lng: 75.795,
    status: 'occupied',
    assigned_hospital_id: '33333333-3333-3333-3333-333333333333',
    er_status: 'pending',
    erStatus: 'pending',
    patient_condition: 'Severe respiratory distress, SpO2 86%',
    triage_level: 'critical',
  },
]

function normalizeHospital(row: Record<string, unknown>): Hospital {
  const numberValue = (value: unknown, fallback = 0) =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback

  const legacyIcuTotal = numberValue(row.icu_beds)
  const legacyIcuOccupied = numberValue(row.icu_occupied)
  const icuBedsTotal = numberValue(row.icuBedsTotal ?? row.icu_beds_total, legacyIcuTotal)
  const icuBedsAvailable = numberValue(
    row.icuBedsAvailable ?? row.icu_beds_available,
    Math.max(0, icuBedsTotal - legacyIcuOccupied)
  )
  const oxygen = row.oxygenStatus ?? row.oxygen_status
  const bloodTypes = row.bloodTypesAvailable ?? row.blood_types_available

  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? 'Unknown Hospital'),
    lat: numberValue(row.lat),
    lng: numberValue(row.lng),
    total_beds: numberValue(row.total_beds),
    occupied_beds: numberValue(row.occupied_beds),
    icu_beds: legacyIcuTotal,
    icu_occupied: legacyIcuOccupied,
    icuBedsTotal,
    icuBedsAvailable,
    ventilatorsAvailable: numberValue(row.ventilatorsAvailable ?? row.ventilators_available),
    oxygenStatus:
      oxygen === 'sufficient' || oxygen === 'low' || oxygen === 'critical'
        ? oxygen
        : 'critical',
    bloodTypesAvailable: Array.isArray(bloodTypes)
      ? bloodTypes.filter((bloodType): bloodType is string => typeof bloodType === 'string')
      : undefined,
    specialties: Array.isArray(row.specialties)
      ? row.specialties.filter((specialty): specialty is string => typeof specialty === 'string')
      : [],
    status:
      row.status === 'operational' || row.status === 'busy' || row.status === 'critical'
        ? row.status
        : 'operational',
    created_at: typeof row.created_at === 'string' ? row.created_at : undefined,
  }
}

function toHospitalRecord(hospital: Hospital) {
  return {
    id: hospital.id,
    name: hospital.name,
    lat: hospital.lat,
    lng: hospital.lng,
    total_beds: hospital.total_beds,
    occupied_beds: hospital.occupied_beds,
    icu_beds: hospital.icu_beds,
    icu_occupied: hospital.icu_occupied,
    icu_beds_total: hospital.icuBedsTotal,
    icu_beds_available: hospital.icuBedsAvailable,
    ventilators_available: hospital.ventilatorsAvailable,
    oxygen_status: hospital.oxygenStatus,
    blood_types_available: hospital.bloodTypesAvailable ?? [],
    specialties: hospital.specialties,
    status: hospital.status,
  }
}

export function useSupabaseData() {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [ambulances, setAmbulances] = useState<Ambulance[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState<boolean>(false)
  const [isSeeding, setIsSeeding] = useState<boolean>(false)

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setHospitals(MOCK_HOSPITALS)
      setAmbulances(MOCK_AMBULANCES)
      setIsLive(false)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const [hospRes, ambRes] = await Promise.all([
        supabase.from('hospitals').select('*').order('name'),
        supabase.from('ambulances').select('*').order('id'),
      ])

      if (hospRes.error) throw hospRes.error
      if (ambRes.error) throw ambRes.error

      if (hospRes.data && hospRes.data.length > 0) {
        setHospitals(hospRes.data.map((row) => normalizeHospital(row as Record<string, unknown>)))
      } else {
        setHospitals(MOCK_HOSPITALS)
      }

      if (ambRes.data && ambRes.data.length > 0) {
        setAmbulances(ambRes.data as Ambulance[])
      } else {
        setAmbulances(MOCK_AMBULANCES)
      }

      setIsLive(true)
      setError(null)
    } catch (err: any) {
      console.error('Supabase fetch error:', err)
      setError(err.message || 'Failed to connect to Supabase')
      setHospitals(MOCK_HOSPITALS)
      setAmbulances(MOCK_AMBULANCES)
      setIsLive(false)
    } finally {
      setLoading(false)
    }
  }, [])

  // Seed sample data to Supabase
  const seedDatabase = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError('Please add your Supabase credentials to .env.local before seeding!')
      return
    }

    try {
      setIsSeeding(true)
      // Upsert hospitals
      const { error: hErr } = await supabase
        .from('hospitals')
        .upsert(MOCK_HOSPITALS.map(toHospitalRecord), { onConflict: 'id' })
      if (hErr) throw hErr

      // Upsert ambulances
      const { error: aErr } = await supabase.from('ambulances').upsert(MOCK_AMBULANCES, { onConflict: 'id' })
      if (aErr) throw aErr

      await fetchData()
    } catch (err: any) {
      console.error('Seeding error:', err)
      setError(`Seeding failed: ${err.message}`)
    } finally {
      setIsSeeding(false)
    }
  }, [fetchData])

  const addAmbulances = useCallback(async (newAmbulances: Ambulance[]) => {
    if (newAmbulances.length === 0) return

    const newIds = new Set(newAmbulances.map((ambulance) => ambulance.id))
    setAmbulances((previous) => [
      ...previous.filter((ambulance) => !newIds.has(ambulance.id)),
      ...newAmbulances,
    ])

    if (!isSupabaseConfigured()) return

    try {
      const { error: insertError } = await supabase.from('ambulances').insert(
        newAmbulances.map((ambulance) => ({
          id: ambulance.id,
          lat: ambulance.lat,
          lng: ambulance.lng,
          status: ambulance.status,
          assigned_hospital_id: ambulance.assigned_hospital_id,
        }))
      )
      if (insertError) throw insertError
    } catch (error) {
      setAmbulances((previous) =>
        previous.filter((ambulance) => !newIds.has(ambulance.id))
      )
      const message = error instanceof Error ? error.message : String(error)
      setError(`Failed to add simulated ambulance requests: ${message}`)
      throw error
    }
  }, [])

  // Generic ambulance update helper (lat, lng, status, assigned_hospital_id, er_status)
  const updateAmbulance = useCallback(
    async (ambulanceId: string, patch: Partial<Ambulance>) => {
      // Optimistic local update for instant map movement & UI telemetry
      setAmbulances((prev) =>
        prev.map((a) => (a.id === ambulanceId ? { ...a, ...patch } : a))
      )

      if (!isSupabaseConfigured()) return

      try {
        // Send only DB-supported fields to Supabase to prevent schema column errors
        const dbPatch: Record<string, any> = {}
        if (patch.lat !== undefined) dbPatch.lat = patch.lat
        if (patch.lng !== undefined) dbPatch.lng = patch.lng
        if (patch.status !== undefined) dbPatch.status = patch.status
        if (patch.assigned_hospital_id !== undefined) dbPatch.assigned_hospital_id = patch.assigned_hospital_id

        if (Object.keys(dbPatch).length > 0) {
          const { error } = await supabase
            .from('ambulances')
            .update(dbPatch)
            .eq('id', ambulanceId)
          if (error) throw error
        }
      } catch (err: any) {
        console.error('Failed to update ambulance in Supabase:', err)
      }
    },
    []
  )

  // Update ambulance ER pre-arrival status and triage info
  const updateAmbulanceErStatus = useCallback(
    async (
      ambulanceId: string,
      erStatus: 'pending' | 'accepted' | 'diverted',
      patientCondition?: string
    ) => {
      const patch: Partial<Ambulance> = {
        er_status: erStatus,
        erStatus: erStatus,
      }
      if (patientCondition) {
        patch.patient_condition = patientCondition
      }
      await updateAmbulance(ambulanceId, patch)
    },
    [updateAmbulance]
  )

  // Simulate a full capacity crisis on a hospital (sets occupied = total)
  const simulateCapacityCrisis = useCallback(
    async (hospitalId: string) => {
      const hospital = hospitals.find((h) => h.id === hospitalId)
      if (!hospital) return

      // Optimistic local update so the real-time watcher fires immediately
      setHospitals((prev) =>
        prev.map((h) =>
          h.id === hospitalId ? { ...h, occupied_beds: h.total_beds } : h
        )
      )

      if (!isSupabaseConfigured()) return

      try {
        const { error } = await supabase
          .from('hospitals')
          .update({ occupied_beds: hospital.total_beds })
          .eq('id', hospitalId)
        if (error) throw error
      } catch (err: any) {
        console.error('Failed to simulate capacity crisis:', err)
      }
    },
    [hospitals]
  )

  // Update occupancy helper function for demo testing
  const updateBedOccupancy = useCallback(
    async (hospitalId: string, occupiedBedsDelta: number) => {
      const target = hospitals.find((h) => h.id === hospitalId)
      if (!target) return

      const newOccupied = Math.max(0, Math.min(target.total_beds, target.occupied_beds + occupiedBedsDelta))

      // Optimistic state update for instant UI feedback
      setHospitals((prev) =>
        prev.map((h) => (h.id === hospitalId ? { ...h, occupied_beds: newOccupied } : h))
      )

      if (!isSupabaseConfigured()) return

      try {
        const { error } = await supabase
          .from('hospitals')
          .update({ occupied_beds: newOccupied })
          .eq('id', hospitalId)
        if (error) throw error
      } catch (err: any) {
        console.error('Failed to update bed occupancy:', err)
      }
    },
    [hospitals]
  )

  useEffect(() => {
    fetchData()

    if (!isSupabaseConfigured()) return

    // Generate unique channel instance ID to prevent channel reuse collisions
    const channelId = `hospital_realtime_${Math.random().toString(36).substring(2, 9)}`

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hospitals' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
          setHospitals((prev) =>
            [...prev, normalizeHospital(payload.new as Record<string, unknown>)].sort((a, b) =>
              a.name.localeCompare(b.name)
            )
            )
        } else if (payload.eventType === 'UPDATE') {
          setHospitals((prev) =>
            prev.map((h) =>
              h.id === payload.new.id
                ? normalizeHospital({ ...h, ...payload.new } as Record<string, unknown>)
                : h
            )
          )
          } else if (payload.eventType === 'DELETE') {
            setHospitals((prev) => prev.filter((h) => h.id === payload.old.id))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ambulances' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
          setAmbulances((prev) => {
            const inserted = payload.new as Ambulance
            return prev.some((ambulance) => ambulance.id === inserted.id)
              ? prev.map((ambulance) =>
                  ambulance.id === inserted.id ? { ...ambulance, ...inserted } : ambulance
                )
              : [...prev, inserted]
          })
          } else if (payload.eventType === 'UPDATE') {
            setAmbulances((prev) =>
              prev.map((a) => (a.id === payload.new.id ? ({ ...a, ...payload.new } as Ambulance) : a))
            )
          } else if (payload.eventType === 'DELETE') {
            setAmbulances((prev) => prev.filter((a) => a.id === payload.old.id))
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  return {
    hospitals,
    ambulances,
    loading,
    error,
    isLive,
    isSeeding,
    isConfigured: isSupabaseConfigured(),
    refetch: fetchData,
    seedDatabase,
    addAmbulances,
    updateBedOccupancy,
    updateAmbulance,
    updateAmbulanceErStatus,
    simulateCapacityCrisis,
  }
}
