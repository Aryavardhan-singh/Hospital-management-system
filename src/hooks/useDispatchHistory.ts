import { useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/supabaseClient'
import { DispatchRecord, HospitalActivityLog, DispatchStatus, ActivityActionType } from '@/types/history'

// Mock data for offline / no-Supabase mode
const MOCK_DISPATCH_HISTORY: DispatchRecord[] = [
  {
    id: '00000001-0000-0000-0000-000000000001',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    citizen_location_lat: 26.9124,
    citizen_location_lng: 75.7873,
    triage_level: 'critical',
    assigned_ambulance_id: 'AMB-101',
    destination_hospital_id: '11111111-1111-1111-1111-111111111111',
    status: 'completed',
    pickup_time: new Date(Date.now() - 3600000 * 2 + 420000).toISOString(),
    arrival_time: new Date(Date.now() - 3600000 * 2 + 1080000).toISOString(),
    er_acceptance_status: 'accepted',
  },
  {
    id: '00000001-0000-0000-0000-000000000002',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    citizen_location_lat: 26.865,
    citizen_location_lng: 75.808,
    triage_level: 'moderate',
    assigned_ambulance_id: 'AMB-103',
    destination_hospital_id: '22222222-2222-2222-2222-222222222222',
    status: 'dispatched',
    er_acceptance_status: 'pending',
  },
  {
    id: '00000001-0000-0000-0000-000000000003',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    citizen_location_lat: 26.9085,
    citizen_location_lng: 75.8155,
    triage_level: 'minor',
    assigned_ambulance_id: 'AMB-102',
    destination_hospital_id: '55555555-5555-5555-5555-555555555555',
    status: 'picked_up',
    pickup_time: new Date(Date.now() - 1800000 + 300000).toISOString(),
    er_acceptance_status: 'pending',
  },
]

const MOCK_ACTIVITY_LOGS: HospitalActivityLog[] = [
  {
    id: 'log-001',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    hospital_id: '11111111-1111-1111-1111-111111111111',
    action_type: 'er_accepted',
    details: { ambulance_id: 'AMB-101', patient_triage: 'critical' },
  },
  {
    id: 'log-002',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    hospital_id: '22222222-2222-2222-2222-222222222222',
    action_type: 'bed_update',
    details: { delta: 2, new_occupied: 137 },
  },
]

export function useDispatchHistory() {
  const [dispatchHistory, setDispatchHistory] = useState<DispatchRecord[]>(MOCK_DISPATCH_HISTORY)
  const [activityLogs, setActivityLogs] = useState<HospitalActivityLog[]>(MOCK_ACTIVITY_LOGS)
  const [loading, setLoading] = useState(false)

  const fetchHistory = useCallback(async (ambulanceId?: string, hospitalId?: string) => {
    if (!isSupabaseConfigured()) return

    setLoading(true)
    try {
      let query = supabase.from('dispatch_history').select('*').order('created_at', { ascending: false }).limit(50)
      if (ambulanceId) query = query.eq('assigned_ambulance_id', ambulanceId)
      if (hospitalId) query = query.eq('destination_hospital_id', hospitalId)

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        setDispatchHistory(data as DispatchRecord[])
      }
    } catch { /* use mock */ }
    setLoading(false)
  }, [])

  const fetchActivityLogs = useCallback(async (hospitalId: string) => {
    if (!isSupabaseConfigured()) return

    try {
      const { data, error } = await supabase
        .from('hospital_activity_logs')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false })
        .limit(30)
      if (!error && data && data.length > 0) {
        setActivityLogs(data as HospitalActivityLog[])
      }
    } catch { /* use mock */ }
  }, [])

  const insertDispatchRecord = useCallback(async (record: Omit<DispatchRecord, 'id' | 'created_at'>): Promise<DispatchRecord | null> => {
    const mockRecord: DispatchRecord = {
      ...record,
      id: `local-${Date.now()}`,
      created_at: new Date().toISOString(),
    }

    if (!isSupabaseConfigured()) {
      setDispatchHistory(prev => [mockRecord, ...prev])
      return mockRecord
    }

    try {
      const { data, error } = await supabase
        .from('dispatch_history')
        .insert([record])
        .select('*')
        .single()
      if (error) throw error
      const inserted = data as DispatchRecord
      setDispatchHistory(prev => [inserted, ...prev])
      return inserted
    } catch {
      setDispatchHistory(prev => [mockRecord, ...prev])
      return mockRecord
    }
  }, [])

  const updateDispatchRecord = useCallback(async (id: string, patch: Partial<DispatchRecord>) => {
    setDispatchHistory(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))

    if (!isSupabaseConfigured()) return

    try {
      await supabase.from('dispatch_history').update(patch).eq('id', id)
    } catch { /* local state already updated */ }
  }, [])

  const logHospitalActivity = useCallback(async (
    hospitalId: string,
    actionType: ActivityActionType,
    details: Record<string, unknown>,
    staffUserId?: string
  ) => {
    const mockLog: HospitalActivityLog = {
      id: `log-${Date.now()}`,
      created_at: new Date().toISOString(),
      hospital_id: hospitalId,
      staff_user_id: staffUserId,
      action_type: actionType,
      details,
    }
    setActivityLogs(prev => [mockLog, ...prev])

    if (!isSupabaseConfigured()) return

    try {
      await supabase.from('hospital_activity_logs').insert([{
        hospital_id: hospitalId,
        staff_user_id: staffUserId ?? null,
        action_type: actionType,
        details,
      }])
    } catch { /* local state already updated */ }
  }, [])

  // Analytics helpers
  const getTodayCompletedRuns = useCallback(() => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    return dispatchHistory.filter(r =>
      r.status === 'completed' && new Date(r.created_at) >= todayStart
    ).length
  }, [dispatchHistory])

  const getAverageResponseMinutes = useCallback(() => {
    const completed = dispatchHistory.filter(r => r.status === 'completed' && r.pickup_time)
    if (completed.length === 0) return 0
    const total = completed.reduce((sum, r) => {
      const start = new Date(r.created_at).getTime()
      const pickup = new Date(r.pickup_time!).getTime()
      return sum + (pickup - start) / 60000
    }, 0)
    return Math.round(total / completed.length)
  }, [dispatchHistory])

  const getDivertCount = useCallback(() => {
    return dispatchHistory.filter(r => r.status === 'diverted').length
  }, [dispatchHistory])

  return {
    dispatchHistory,
    activityLogs,
    loading,
    fetchHistory,
    fetchActivityLogs,
    insertDispatchRecord,
    updateDispatchRecord,
    logHospitalActivity,
    getTodayCompletedRuns,
    getAverageResponseMinutes,
    getDivertCount,
  }
}

export type { DispatchStatus }
