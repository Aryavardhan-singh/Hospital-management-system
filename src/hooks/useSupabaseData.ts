import { useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/supabaseClient'
import { Hospital, Ambulance } from '@/types'
import { reportDataWriteError } from '@/lib/dataErrors'
import {
  queueAction,
  getQueuedActions,
  removeQueuedAction,
  type QueuedAction,
} from '@/lib/offlineQueue'

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
    bloodTypesAvailable: ['A+', 'B+', 'O+'],
    specialties: ['Cardiology', 'Nephrology', 'Critical Care'],
    status: 'operational',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Manipal Hospital',
    lat: 26.902,
    lng: 75.751,
    total_beds: 140,
    occupied_beds: 72,
    icu_beds: 25,
    icu_occupied: 10,
    icuBedsTotal: 25,
    icuBedsAvailable: 15,
    ventilatorsAvailable: 10,
    oxygenStatus: 'sufficient',
    bloodTypesAvailable: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    specialties: ['General Medicine', 'Paediatrics', 'Orthopaedics'],
    status: 'operational',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'JK Lone Hospital (Paediatrics)',
    lat: 26.9085,
    lng: 75.8155,
    total_beds: 120,
    occupied_beds: 108,
    icu_beds: 20,
    icu_occupied: 18,
    icuBedsTotal: 20,
    icuBedsAvailable: 2,
    ventilatorsAvailable: 1,
    oxygenStatus: 'critical',
    bloodTypesAvailable: ['O+', 'B+'],
    specialties: ['Paediatrics', 'Neonatology', 'Critical Care'],
    status: 'operational',
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    name: 'Mahila Chikitsalaya',
    lat: 26.9189,
    lng: 75.823,
    total_beds: 90,
    occupied_beds: 58,
    icu_beds: 15,
    icu_occupied: 6,
    icuBedsTotal: 15,
    icuBedsAvailable: 9,
    ventilatorsAvailable: 5,
    oxygenStatus: 'sufficient',
    bloodTypesAvailable: ['A+', 'B+', 'O+', 'O-'],
    specialties: ['Maternity', 'Gynaecology', 'Obstetrics'],
    status: 'operational',
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    name: 'Apex Hospital',
    lat: 26.852,
    lng: 75.812,
    total_beds: 110,
    occupied_beds: 79,
    icu_beds: 22,
    icu_occupied: 13,
    icuBedsTotal: 22,
    icuBedsAvailable: 9,
    ventilatorsAvailable: 6,
    oxygenStatus: 'sufficient',
    bloodTypesAvailable: ['A+', 'B+', 'AB+', 'O+'],
    specialties: ['Cardiology', 'Neurology', 'Critical Care'],
    status: 'operational',
  },
]

const MOCK_AMBULANCES: Ambulance[] = [
  {
    id: 'AMB-101',
    lat: 26.9124,
    lng: 75.807,
    status: 'idle',
    assigned_hospital_id: '11111111-1111-1111-1111-111111111111',
  },
  {
    id: 'AMB-102',
    lat: 26.9085,
    lng: 75.8155,
    status: 'idle',
    assigned_hospital_id: '55555555-5555-5555-5555-555555555555',
  },
  {
    id: 'AMB-103',
    lat: 26.8656,
    lng: 75.808,
    status: 'idle',
    assigned_hospital_id: '22222222-2222-2222-2222-222222222222',
  },
  {
    id: 'AMB-104',
    lat: 26.852,
    lng: 75.812,
    status: 'enroute',
    assigned_hospital_id: '77777777-7777-7777-7777-777777777777',
  },
  {
    id: 'AMB-105',
    lat: 26.902,
    lng: 75.751,
    status: 'idle',
    assigned_hospital_id: '44444444-4444-4444-4444-444444444444',
  },
  {
    id: 'AMB-106',
    lat: 26.81,
    lng: 75.797,
    status: 'occupied',
    assigned_hospital_id: '33333333-3333-3333-3333-333333333333',
  },
  {
    id: 'AMB-107',
    lat: 26.9189,
    lng: 75.823,
    status: 'idle',
    assigned_hospital_id: '66666666-6666-6666-6666-666666666666',
  },
]

function normalizeHospital(row: Record<string, unknown>): Hospital {
  const totalBeds = Number(row.total_beds ?? 0)
  const occupiedBeds = Number(row.occupied_beds ?? 0)
  const icuBeds = Number(row.icu_beds ?? 0)
  const icuOccupied = Number(row.icu_occupied ?? 0)
  const icuBedsTotal = row.icuBedsTotal !== undefined ? Number(row.icuBedsTotal) : icuBeds
  const icuBedsAvailable =
    row.icuBedsAvailable !== undefined
      ? Number(row.icuBedsAvailable)
      : Math.max(0, icuBeds - icuOccupied)
  const ventilatorsAvailable =
    row.ventilatorsAvailable !== undefined ? Number(row.ventilatorsAvailable) : 5
  const oxygenStatus =
    row.oxygenStatus === 'sufficient' || row.oxygenStatus === 'low' || row.oxygenStatus === 'critical'
      ? row.oxygenStatus
      : 'sufficient'
  const bloodTypesAvailable = Array.isArray(row.bloodTypesAvailable)
    ? (row.bloodTypesAvailable as string[])
    : undefined

  const status: 'operational' | 'busy' | 'critical' =
    row.status === 'critical' || row.status === 'busy' || row.status === 'operational'
      ? row.status
      : totalBeds > 0 && occupiedBeds / totalBeds >= 0.95
        ? 'critical'
        : totalBeds > 0 && occupiedBeds / totalBeds >= 0.75
          ? 'busy'
          : 'operational'

  return {
    id: String(row.id),
    name: String(row.name),
    lat: Number(row.lat),
    lng: Number(row.lng),
    total_beds: totalBeds,
    occupied_beds: occupiedBeds,
    icu_beds: icuBeds,
    icu_occupied: icuOccupied,
    icuBedsTotal,
    icuBedsAvailable,
    ventilatorsAvailable,
    oxygenStatus,
    bloodTypesAvailable,
    specialties: Array.isArray(row.specialties) ? (row.specialties as string[]) : [],
    status,
  }
}

function toHospitalRecord(hospital: Hospital): Record<string, unknown> {
  const record: Record<string, unknown> = {
    id: hospital.id,
    name: hospital.name,
    lat: hospital.lat,
    lng: hospital.lng,
    total_beds: hospital.total_beds,
    occupied_beds: hospital.occupied_beds,
    icu_beds: hospital.icu_beds,
    icu_occupied: hospital.icu_occupied,
    specialties: hospital.specialties,
    status: hospital.status,
  }
  if (hospital.icuBedsTotal !== undefined) record.icuBedsTotal = hospital.icuBedsTotal
  if (hospital.icuBedsAvailable !== undefined) record.icuBedsAvailable = hospital.icuBedsAvailable
  if (hospital.ventilatorsAvailable !== undefined) record.ventilatorsAvailable = hospital.ventilatorsAvailable
  if (hospital.oxygenStatus !== undefined) record.oxygenStatus = hospital.oxygenStatus
  if (hospital.bloodTypesAvailable !== undefined) record.bloodTypesAvailable = hospital.bloodTypesAvailable
  return record
}

function normalizeAmbulance(row: Record<string, unknown>): Ambulance {
  const erStatus =
    row.er_status === 'pending' || row.er_status === 'accepted' || row.er_status === 'diverted'
      ? row.er_status
      : undefined

  return {
    id: String(row.id),
    lat: Number(row.lat),
    lng: Number(row.lng),
    status:
      row.status === 'enroute' || row.status === 'occupied'
        ? row.status
        : 'idle',
    assigned_hospital_id: row.assigned_hospital_id ? String(row.assigned_hospital_id) : null,
    er_status: erStatus,
    erStatus,
    patient_condition: row.patient_condition ? String(row.patient_condition) : undefined,
    triage_level:
      row.triage_level === 'critical' || row.triage_level === 'moderate' || row.triage_level === 'minor'
        ? row.triage_level
        : undefined,
    severity:
      row.severity === 'critical' || row.severity === 'moderate' || row.severity === 'minor'
        ? row.severity
        : undefined,
    dispatch_stage:
      row.dispatch_stage === 'dispatched' ||
      row.dispatch_stage === 'enroute_pickup' ||
      row.dispatch_stage === 'picked_up' ||
      row.dispatch_stage === 'enroute_hospital' ||
      row.dispatch_stage === 'arrived'
        ? row.dispatch_stage
        : undefined,
    patient_lat: row.patient_lat !== undefined && row.patient_lat !== null ? Number(row.patient_lat) : undefined,
    patient_lng: row.patient_lng !== undefined && row.patient_lng !== null ? Number(row.patient_lng) : undefined,
  }
}

function toAmbulanceRecord(ambulance: Ambulance): Record<string, unknown> {
  const record: Record<string, unknown> = {
    id: ambulance.id,
    lat: ambulance.lat,
    lng: ambulance.lng,
    status: ambulance.status,
    assigned_hospital_id: ambulance.assigned_hospital_id,
  }
  const erStatus = ambulance.er_status ?? ambulance.erStatus
  if (erStatus !== undefined) record.er_status = erStatus
  if (ambulance.patient_condition !== undefined) record.patient_condition = ambulance.patient_condition
  if (ambulance.triage_level !== undefined) record.triage_level = ambulance.triage_level
  if (ambulance.severity !== undefined) record.severity = ambulance.severity
  if (ambulance.dispatch_stage !== undefined) record.dispatch_stage = ambulance.dispatch_stage
  if (ambulance.patient_lat !== undefined) record.patient_lat = ambulance.patient_lat
  if (ambulance.patient_lng !== undefined) record.patient_lng = ambulance.patient_lng
  return record
}

export function useSupabaseData() {
  const [hospitals, setHospitals] = useState<Hospital[]>(() => {
    // Attempt local storage cache first for instant offline startup
    try {
      const cached = localStorage.getItem('mednet_cached_hospitals')
      if (cached) return JSON.parse(cached)
    } catch {}
    return MOCK_HOSPITALS
  })
  const [ambulances, setAmbulances] = useState<Ambulance[]>(() => {
    try {
      const cached = localStorage.getItem('mednet_cached_ambulances')
      if (cached) return JSON.parse(cached)
    } catch {}
    return MOCK_AMBULANCES
  })
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState<boolean>(false)
  const [isUsingMockData, setIsUsingMockData] = useState<boolean>(false)
  const [isSeeding, setIsSeeding] = useState<boolean>(false)
  const [queuedCount, setQueuedCount] = useState<number>(0)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)

  // Cache state updates to localStorage for seamless offline restarts
  const updateCachedHospitals = useCallback((data: Hospital[]) => {
    setHospitals(data)
    try {
      localStorage.setItem('mednet_cached_hospitals', JSON.stringify(data))
    } catch {}
  }, [])

  const updateCachedAmbulances = useCallback((data: Ambulance[]) => {
    setAmbulances(data)
    try {
      localStorage.setItem('mednet_cached_ambulances', JSON.stringify(data))
    } catch {}
  }, [])

  // Refresh queued actions count from IndexedDB
  const refreshQueuedCount = useCallback(async () => {
    try {
      const actions = await getQueuedActions()
      setQueuedCount(actions.length)
    } catch {
      setQueuedCount(0)
    }
  }, [])

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!navigator.onLine || !isSupabaseConfigured()) {
      setIsLive(false)
      setIsUsingMockData(true)
      setLoading(false)
      void refreshQueuedCount()
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

      const usingMockData = !hospRes.data?.length || !ambRes.data?.length
      if (hospRes.data && hospRes.data.length > 0) {
        updateCachedHospitals(hospRes.data.map((row) => normalizeHospital(row as Record<string, unknown>)))
      } else {
        updateCachedHospitals(MOCK_HOSPITALS)
      }

      if (ambRes.data && ambRes.data.length > 0) {
        updateCachedAmbulances(ambRes.data.map((row) => normalizeAmbulance(row as Record<string, unknown>)))
      } else {
        updateCachedAmbulances(MOCK_AMBULANCES)
      }

      setIsLive(true)
      setIsUsingMockData(usingMockData)
      setError(null)
    } catch (err: unknown) {
      console.warn('Supabase fetch failed or network offline, falling back to cache:', err)
      setIsLive(false)
      setIsUsingMockData(true)
    } finally {
      setLoading(false)
      void refreshQueuedCount()
    }
  }, [updateCachedHospitals, updateCachedAmbulances, refreshQueuedCount])

  // Flush background sync queue to Supabase when online
  const flushOfflineQueue = useCallback(async () => {
    if (!navigator.onLine || !isSupabaseConfigured()) return
    setIsSyncing(true)

    try {
      const queue: QueuedAction[] = await getQueuedActions()
      if (queue.length === 0) {
        setIsSyncing(false)
        setQueuedCount(0)
        return
      }

      for (const action of queue) {
        try {
          if (action.type === 'request_ambulance') {
            const ambulance = action.payload as unknown as Ambulance
            await supabase.from('ambulances').insert([toAmbulanceRecord(ambulance)])
          } else if (action.type === 'update_ambulance') {
            const { id, ...patch } = action.payload
            await supabase.from('ambulances').update(patch).eq('id', id)
          } else if (action.type === 'update_bed_occupancy') {
            const { id, occupied_beds } = action.payload
            await supabase.from('hospitals').update({ occupied_beds }).eq('id', id)
          }

          if (action.id) {
            await removeQueuedAction(action.id)
          }
        } catch (itemError) {
          console.error('[OfflineQueue] Failed to sync item:', action, itemError)
          // Keep item in queue if transient failure
        }
      }

      await refreshQueuedCount()
    } catch (err) {
      console.error('[OfflineQueue] Error during queue flush:', err)
    } finally {
      setIsSyncing(false)
    }
  }, [refreshQueuedCount])

  // Monitor network online event to trigger flush
  useEffect(() => {
    const handleOnline = () => {
      void flushOfflineQueue()
      void fetchData()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [flushOfflineQueue, fetchData])

  // Seed sample data to Supabase
  const seedDatabase = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError('Please add your Supabase credentials to .env.local before seeding!')
      return
    }

    try {
      setIsSeeding(true)
      setError(null)

      let { data: hospitalRows, error: hErr } = await supabase
        .from('hospitals')
        .upsert(MOCK_HOSPITALS.map(toHospitalRecord), { onConflict: 'id' })
        .select('id')

      if (hErr && hErr.code === 'PGRST204') {
        const fallback = await supabase
          .from('hospitals')
          .upsert(
            MOCK_HOSPITALS.map((hospital) => {
              const row = toHospitalRecord(hospital)
              delete row.icuBedsTotal
              delete row.icuBedsAvailable
              delete row.ventilatorsAvailable
              delete row.oxygenStatus
              delete row.bloodTypesAvailable
              return row
            }),
            { onConflict: 'id' }
          )
          .select('id')
        hospitalRows = fallback.data
        hErr = fallback.error
      }

      if (hErr) throw hErr
      if (!hospitalRows || hospitalRows.length !== MOCK_HOSPITALS.length) {
        throw new Error('The database did not confirm every hospital seed record.')
      }

      let { data: ambulanceRows, error: aErr } = await supabase
        .from('ambulances')
        .upsert(MOCK_AMBULANCES.map(toAmbulanceRecord), { onConflict: 'id' })
        .select('id')

      if (aErr && aErr.code === 'PGRST204') {
        const fallback = await supabase
          .from('ambulances')
          .upsert(
            MOCK_AMBULANCES.map((ambulance) => {
              const row = toAmbulanceRecord(ambulance)
              delete row.er_status
              delete row.patient_condition
              delete row.triage_level
              delete row.severity
              delete row.dispatch_stage
              delete row.patient_lat
              delete row.patient_lng
              return row
            }),
            { onConflict: 'id' }
          )
          .select('id')
        ambulanceRows = fallback.data
        aErr = fallback.error
      }

      if (aErr) throw aErr
      if (!ambulanceRows || ambulanceRows.length !== MOCK_AMBULANCES.length) {
        throw new Error('The database did not confirm every ambulance seed record.')
      }

      await fetchData()
    } catch (err: unknown) {
      console.error('Seeding error:', err)
      const failure = reportDataWriteError(
        'Database seeding',
        err instanceof Error ? err : new Error(String(err))
      )
      setError(failure.message)
    } finally {
      setIsSeeding(false)
    }
  }, [fetchData])

  const addAmbulances = useCallback(async (newAmbulances: Ambulance[]) => {
    if (newAmbulances.length === 0) return

    const newIds = new Set(newAmbulances.map((ambulance) => ambulance.id))
    
    // If offline or Supabase fails, queue in IndexedDB
    if (!navigator.onLine || !isSupabaseConfigured()) {
      for (const amb of newAmbulances) {
        await queueAction('request_ambulance', amb as unknown as Record<string, unknown>)
      }
      await refreshQueuedCount()
    } else {
      try {
        const { data, error: insertError } = await supabase
          .from('ambulances')
          .insert(newAmbulances.map(toAmbulanceRecord))
          .select('id')
        if (insertError) throw insertError
        if (!data || data.length !== newAmbulances.length) {
          throw new Error('The database did not confirm every ambulance record.')
        }
      } catch (error) {
        console.warn('Network error adding ambulance, enqueuing for background sync:', error)
        for (const amb of newAmbulances) {
          await queueAction('request_ambulance', amb as unknown as Record<string, unknown>)
        }
        await refreshQueuedCount()
      }
    }

    updateCachedAmbulances([
      ...ambulances.filter((ambulance) => !newIds.has(ambulance.id)),
      ...newAmbulances,
    ])
  }, [ambulances, updateCachedAmbulances, refreshQueuedCount])

  // Generic ambulance update helper
  const updateAmbulance = useCallback(
    async (ambulanceId: string, patch: Partial<Ambulance>) => {
      const dbPatch: Record<string, unknown> = {}
      if (patch.lat !== undefined) dbPatch.lat = patch.lat
      if (patch.lng !== undefined) dbPatch.lng = patch.lng
      if (patch.status !== undefined) dbPatch.status = patch.status
      if (patch.assigned_hospital_id !== undefined) dbPatch.assigned_hospital_id = patch.assigned_hospital_id
      const erStatus = patch.er_status ?? patch.erStatus
      if (erStatus !== undefined) dbPatch.er_status = erStatus
      if (patch.patient_condition !== undefined) dbPatch.patient_condition = patch.patient_condition
      if (patch.triage_level !== undefined) dbPatch.triage_level = patch.triage_level
      if (patch.severity !== undefined) dbPatch.severity = patch.severity
      if (patch.dispatch_stage !== undefined) dbPatch.dispatch_stage = patch.dispatch_stage
      if (patch.patient_lat !== undefined) dbPatch.patient_lat = patch.patient_lat
      if (patch.patient_lng !== undefined) dbPatch.patient_lng = patch.patient_lng

      if (!navigator.onLine || !isSupabaseConfigured()) {
        if (Object.keys(dbPatch).length > 0) {
          await queueAction('update_ambulance', { id: ambulanceId, ...dbPatch })
          await refreshQueuedCount()
        }
      } else {
        try {
          if (Object.keys(dbPatch).length > 0) {
            const { data, error } = await supabase
              .from('ambulances')
              .update(dbPatch)
              .eq('id', ambulanceId)
              .select('id')
            if (error) throw error
            if (!data || data.length === 0) throw new Error('The ambulance record was not found.')
          }
        } catch (error) {
          console.warn('Network error updating ambulance, enqueuing for background sync:', error)
          await queueAction('update_ambulance', { id: ambulanceId, ...dbPatch })
          await refreshQueuedCount()
        }
      }

      updateCachedAmbulances(
        ambulances.map((a) => (a.id === ambulanceId ? { ...a, ...patch } : a))
      )
    },
    [ambulances, updateCachedAmbulances, refreshQueuedCount]
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
        erStatus,
      }
      if (patientCondition) {
        patch.patient_condition = patientCondition
      }
      await updateAmbulance(ambulanceId, patch)
    },
    [updateAmbulance]
  )

  // Simulate a full capacity crisis on a hospital
  const simulateCapacityCrisis = useCallback(
    async (hospitalId: string) => {
      const hospital = hospitals.find((h) => h.id === hospitalId)
      if (!hospital) return

      if (!navigator.onLine || !isSupabaseConfigured()) {
        await queueAction('update_bed_occupancy', { id: hospitalId, occupied_beds: hospital.total_beds })
        await refreshQueuedCount()
      } else {
        try {
          const { data, error } = await supabase
            .from('hospitals')
            .update({ occupied_beds: hospital.total_beds })
            .eq('id', hospitalId)
            .select('id')
          if (error) throw error
          if (!data || data.length === 0) throw new Error('The hospital record was not found.')
        } catch (error) {
          console.warn('Error simulating capacity surge, queuing for offline sync:', error)
          await queueAction('update_bed_occupancy', { id: hospitalId, occupied_beds: hospital.total_beds })
          await refreshQueuedCount()
        }
      }

      updateCachedHospitals(
        hospitals.map((h) =>
          h.id === hospitalId ? { ...h, occupied_beds: hospital.total_beds } : h
        )
      )
    },
    [hospitals, updateCachedHospitals, refreshQueuedCount]
  )

  // Update occupancy helper function
  const updateBedOccupancy = useCallback(
    async (hospitalId: string, occupiedBedsDelta: number) => {
      const target = hospitals.find((h) => h.id === hospitalId)
      if (!target) return

      const newOccupied = Math.max(0, Math.min(target.total_beds, target.occupied_beds + occupiedBedsDelta))

      if (!navigator.onLine || !isSupabaseConfigured()) {
        await queueAction('update_bed_occupancy', { id: hospitalId, occupied_beds: newOccupied })
        await refreshQueuedCount()
      } else {
        try {
          const { data, error } = await supabase
            .from('hospitals')
            .update({ occupied_beds: newOccupied })
            .eq('id', hospitalId)
            .select('id')
          if (error) throw error
          if (!data || data.length === 0) throw new Error('The hospital record was not found.')
        } catch (error) {
          console.warn('Error updating bed occupancy, queuing for offline sync:', error)
          await queueAction('update_bed_occupancy', { id: hospitalId, occupied_beds: newOccupied })
          await refreshQueuedCount()
        }
      }

      updateCachedHospitals(
        hospitals.map((h) => (h.id === hospitalId ? { ...h, occupied_beds: newOccupied } : h))
      )
    },
    [hospitals, updateCachedHospitals, refreshQueuedCount]
  )

  // Reserve or release an ICU bed for critical triage dispatches
  const adjustIcuReservation = useCallback(
    async (hospitalId: string, delta: number) => {
      const target = hospitals.find((h) => h.id === hospitalId)
      if (!target) return

      const currentReserved = target.reserved_icu_beds ?? 0
      const newReserved = Math.max(0, currentReserved + delta)
      const newAvailable = Math.max(0, (target.icuBedsAvailable ?? 0) - (delta > 0 ? delta : 0))

      if (isSupabaseConfigured() && navigator.onLine) {
        try {
          await supabase
            .from('hospitals')
            .update({ icu_beds_available: newAvailable })
            .eq('id', hospitalId)
        } catch (err) {
          console.warn('Failed to persist ICU reservation in Supabase:', err)
        }
      }

      updateCachedHospitals(
        hospitals.map((h) =>
          h.id === hospitalId
            ? { ...h, reserved_icu_beds: newReserved, icuBedsAvailable: newAvailable }
            : h
        )
      )
    },
    [hospitals, updateCachedHospitals]
  )

  useEffect(() => {
    let isMounted = true
    queueMicrotask(() => {
      if (isMounted) void fetchData()
    })

    if (!isSupabaseConfigured() || !navigator.onLine) {
      return () => {
        isMounted = false
      }
    }

    const channelId = `hospital_realtime_${Math.random().toString(36).substring(2, 9)}`

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hospitals' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setHospitals((prev) => {
              const updated = [...prev, normalizeHospital(payload.new as Record<string, unknown>)].sort((a, b) =>
                a.name.localeCompare(b.name)
              )
              try { localStorage.setItem('mednet_cached_hospitals', JSON.stringify(updated)) } catch {}
              return updated
            })
          } else if (payload.eventType === 'UPDATE') {
            setHospitals((prev) => {
              const updated = prev.map((h) =>
                h.id === payload.new.id
                  ? normalizeHospital({ ...h, ...payload.new } as Record<string, unknown>)
                  : h
              )
              try { localStorage.setItem('mednet_cached_hospitals', JSON.stringify(updated)) } catch {}
              return updated
            })
          } else if (payload.eventType === 'DELETE') {
            setHospitals((prev) => {
              const updated = prev.filter((h) => h.id !== payload.old.id)
              try { localStorage.setItem('mednet_cached_hospitals', JSON.stringify(updated)) } catch {}
              return updated
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ambulances' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAmbulances((prev) => {
              const inserted = normalizeAmbulance(payload.new as Record<string, unknown>)
              const updated = prev.some((ambulance) => ambulance.id === inserted.id)
                ? prev.map((ambulance) =>
                    ambulance.id === inserted.id ? { ...ambulance, ...inserted } : ambulance
                  )
                : [...prev, inserted]
              try { localStorage.setItem('mednet_cached_ambulances', JSON.stringify(updated)) } catch {}
              return updated
            })
          } else if (payload.eventType === 'UPDATE') {
            setAmbulances((prev) => {
              const updated = prev.map((a) =>
                a.id === payload.new.id
                  ? normalizeAmbulance({ ...a, ...payload.new } as Record<string, unknown>)
                  : a
              )
              try { localStorage.setItem('mednet_cached_ambulances', JSON.stringify(updated)) } catch {}
              return updated
            })
          } else if (payload.eventType === 'DELETE') {
            setAmbulances((prev) => {
              const updated = prev.filter((a) => a.id !== payload.old.id)
              try { localStorage.setItem('mednet_cached_ambulances', JSON.stringify(updated)) } catch {}
              return updated
            })
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true)
        }
      })

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  return {
    hospitals,
    ambulances,
    loading,
    error,
    isLive,
    isUsingMockData,
    isSeeding,
    queuedCount,
    isSyncing,
    flushOfflineQueue,
    isConfigured: isSupabaseConfigured(),
    refetch: fetchData,
    seedDatabase,
    addAmbulances,
    updateBedOccupancy,
    adjustIcuReservation,
    updateAmbulance,
    updateAmbulanceErStatus,
    simulateCapacityCrisis,
  }
}
