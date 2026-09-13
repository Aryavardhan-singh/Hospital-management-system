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
  },
  {
    id: 'AMB-102',
    lat: 26.862,
    lng: 75.809,
    status: 'enroute',
    assigned_hospital_id: '22222222-2222-2222-2222-222222222222',
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
  },
]

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
        setHospitals(hospRes.data as Hospital[])
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
      const { error: hErr } = await supabase.from('hospitals').upsert(MOCK_HOSPITALS, { onConflict: 'id' })
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

  // Generic ambulance update helper (lat, lng, status, assigned_hospital_id)
  const updateAmbulance = useCallback(
    async (ambulanceId: string, patch: Partial<Ambulance>) => {
      // Optimistic local update for instant map movement
      setAmbulances((prev) =>
        prev.map((a) => (a.id === ambulanceId ? { ...a, ...patch } : a))
      )

      if (!isSupabaseConfigured()) return

      try {
        const { error } = await supabase
          .from('ambulances')
          .update(patch)
          .eq('id', ambulanceId)
        if (error) throw error
      } catch (err: any) {
        console.error('Failed to update ambulance:', err)
      }
    },
    []
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
            setHospitals((prev) => [...prev, payload.new as Hospital].sort((a, b) => a.name.localeCompare(b.name)))
          } else if (payload.eventType === 'UPDATE') {
            setHospitals((prev) =>
              prev.map((h) => (h.id === payload.new.id ? ({ ...h, ...payload.new } as Hospital) : h))
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
            setAmbulances((prev) => [...prev, payload.new as Ambulance])
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
    updateBedOccupancy,
    updateAmbulance,
    simulateCapacityCrisis,
  }
}
