import { useEffect, useRef, useCallback } from 'react'
import { Hospital, Ambulance } from '@/types'
import { findBestHospital, RoutingOptions, RoutingResult } from '@/lib/routing'

const STEP_SIZE          = 0.0008  // degrees per tick (~88m at Jaipur latitude)
const ARRIVAL_THRESHOLD  = 0.0012  // degrees (~130m) — considered arrived
const TICK_MS            = 2500    // move every 2.5 seconds
const CAPACITY_CRISIS_PCT = 95     // trigger auto-diversion above this %

type UpdateAmbulanceFn = (id: string, patch: Partial<Ambulance>) => Promise<void>
type OnRerouteFn = (
  ambulanceId: string,
  fromHospitalName: string,
  toHospitalName: string
) => void

/**
 * Drives GPS movement simulation and auto-diversion for ambulances.
 *
 * Movement tick (every TICK_MS):
 *   - Moves each "enroute" ambulance one step toward its assigned hospital
 *   - On arrival, sets status → "occupied"
 *
 * Auto-diversion watcher (runs whenever hospitals data changes):
 *   - If any hospital crosses CAPACITY_CRISIS_PCT%, all "enroute"
 *     ambulances heading there are re-routed via smart scoring
 *
 * dispatchAmbulance: uses findBestHospital (weighted score) instead of
 *   simple nearest-distance. Returns the full RoutingResult for UI display.
 */
export function useAmbulanceSimulation(
  ambulances: Ambulance[],
  hospitals: Hospital[],
  updateAmbulance: UpdateAmbulanceFn,
  onReroute?: OnRerouteFn,
  requiredSpecialty?: string | null,
  routingOptions?: RoutingOptions,
  simulationFeatures: { enableMovement?: boolean; enableAutoDiversion?: boolean } = {}
) {
  // Always-fresh refs — safe to read inside setInterval / useEffect callbacks
  const ambulancesRef = useRef<Ambulance[]>(ambulances)
  useEffect(() => { ambulancesRef.current = ambulances }, [ambulances])

  const hospitalsRef = useRef<Hospital[]>(hospitals)
  useEffect(() => { hospitalsRef.current = hospitals }, [hospitals])

  const onRerouteRef = useRef<OnRerouteFn | undefined>(onReroute)
  useEffect(() => { onRerouteRef.current = onReroute }, [onReroute])

  const routingOptionsRef = useRef<RoutingOptions | undefined>(routingOptions)
  useEffect(() => { routingOptionsRef.current = routingOptions }, [routingOptions])

  // ── GPS Movement Tick ───────────────────────────────────────────────────
  useEffect(() => {
    if (simulationFeatures.enableMovement === false) return

    const interval = setInterval(() => {
      const enroute = ambulancesRef.current.filter(
        (a) => a.status === 'enroute' && a.assigned_hospital_id
      )

      for (const amb of enroute) {
        const target = hospitalsRef.current.find((h) => h.id === amb.assigned_hospital_id)
        if (!target) continue

        // Check if this is a citizen dispatch with two-stage navigation
        // Stage 1: Heading to pickup citizen at (patient_lat, patient_lng)
        // Stage 2: Picked up, heading to hospital
        const isHeadingToPatient =
          amb.patient_lat != null &&
          amb.patient_lng != null &&
          (amb.dispatch_stage === 'enroute_pickup' ||
            amb.dispatch_stage === 'dispatched' ||
            !amb.dispatch_stage)

        if (isHeadingToPatient && amb.patient_lat != null && amb.patient_lng != null) {
          const dLat = amb.patient_lat - amb.lat
          const dLng = amb.patient_lng - amb.lng
          const distance = Math.sqrt(dLat * dLat + dLng * dLng)

          if (distance < ARRIVAL_THRESHOLD) {
            // Reached citizen! Snap to citizen coordinates and advance stage
            updateAmbulance(amb.id, {
              lat: amb.patient_lat,
              lng: amb.patient_lng,
              dispatch_stage: 'picked_up',
              status: 'enroute',
              patient_condition: `${amb.severity?.toUpperCase() || 'Emergency'} patient on board - Transferring to ER`,
            })
          } else {
            // Move one step toward citizen
            const ratio = STEP_SIZE / distance
            updateAmbulance(amb.id, {
              lat: amb.lat + dLat * ratio,
              lng: amb.lng + dLng * ratio,
              dispatch_stage: 'enroute_pickup',
            })
          }
          continue
        }

        // Stage 2: Moving toward the destination hospital
        const dLat = target.lat - amb.lat
        const dLng = target.lng - amb.lng
        const distance = Math.sqrt(dLat * dLat + dLng * dLng)

        if (distance < ARRIVAL_THRESHOLD) {
          // Arrived — snap to hospital coordinates and mark occupied
          updateAmbulance(amb.id, {
            lat: target.lat,
            lng: target.lng,
            status: 'occupied',
            dispatch_stage: 'arrived',
          })
        } else {
          // Move one normalised step toward hospital
          const ratio = STEP_SIZE / distance
          updateAmbulance(amb.id, {
            lat: amb.lat + dLat * ratio,
            lng: amb.lng + dLng * ratio,
            dispatch_stage: amb.patient_lat != null ? 'enroute_hospital' : amb.dispatch_stage,
          })
        }
      }
    }, TICK_MS)

    return () => clearInterval(interval)
  }, [updateAmbulance, simulationFeatures.enableMovement])

  // ── Auto-Diversion Watcher ──────────────────────────────────────────────
  // Track previous capacity values to only trigger when a hospital CROSSES
  // the threshold (not on every re-render).
  const prevCapacityRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    if (simulationFeatures.enableAutoDiversion === false) return
    if (hospitals.length === 0) return

    for (const hospital of hospitals) {
      const capPct =
        hospital.total_beds > 0
          ? (hospital.occupied_beds / hospital.total_beds) * 100
          : 0

      const prevPct = prevCapacityRef.current.get(hospital.id) ?? 0

      // Only trigger when the hospital JUST crossed the threshold
      if (capPct >= CAPACITY_CRISIS_PCT && prevPct < CAPACITY_CRISIS_PCT) {
        // Find ambulances currently heading to this hospital
        const affected = ambulancesRef.current.filter(
          (a) => a.status === 'enroute' && a.assigned_hospital_id === hospital.id
        )

        for (const amb of affected) {
          // Re-run smart routing excluding the crisis hospital
          const result = findBestHospital(
            amb,
            hospitalsRef.current,
            requiredSpecialty,
            amb.severity,
            routingOptionsRef.current
          )

          if (result && result.hospital.id !== hospital.id) {
            // Reroute
            updateAmbulance(amb.id, {
              assigned_hospital_id: result.hospital.id,
            })
            onRerouteRef.current?.(amb.id, hospital.name, result.hospital.name)
          }
        }
      }

      prevCapacityRef.current.set(hospital.id, capPct)
    }
  }, [hospitals, updateAmbulance, requiredSpecialty, simulationFeatures.enableAutoDiversion])

  // ── Dispatch (smart routing) ────────────────────────────────────────────
  /**
   * Dispatch an idle ambulance using the weighted scoring function.
   * Returns the full RoutingResult so the UI can display score breakdown.
   */
  const dispatchAmbulance = useCallback(
    async (ambulanceId: string): Promise<RoutingResult | null> => {
      const amb = ambulancesRef.current.find((a) => a.id === ambulanceId)
      if (!amb || amb.status !== 'idle') return null

      const result = findBestHospital(
        amb,
        hospitalsRef.current,
        requiredSpecialty,
        amb.severity,
        routingOptionsRef.current
      )
      if (!result) return null

      await updateAmbulance(ambulanceId, {
        status: 'enroute',
        assigned_hospital_id: result.hospital.id,
        er_status: 'pending',
        erStatus: 'pending',
        patient_condition: 'Emergency patient en route - Triage evaluation pending',
        triage_level: 'urgent',
      })

      return result
    },
    [updateAmbulance, requiredSpecialty]
  )

  // ── Manual ER Divert ─────────────────────────────────────────────────────
  /**
   * Manually divert an active/incoming ambulance to the next best available hospital.
   * Excludes the currently assigned hospital from candidate selection.
   */
  const divertAmbulance = useCallback(
    async (ambulanceId: string, reason?: string): Promise<RoutingResult | null> => {
      const amb = ambulancesRef.current.find((a) => a.id === ambulanceId)
      if (!amb || !amb.assigned_hospital_id) return null

      const currentHospital = hospitalsRef.current.find(
        (h) => h.id === amb.assigned_hospital_id
      )
      const fromName = currentHospital?.name || 'Current Hospital'

      // Exclude the current hospital so router selects the next best alternative
      const candidates = hospitalsRef.current.filter(
        (h) => h.id !== amb.assigned_hospital_id
      )
      if (candidates.length === 0) return null

      const result = findBestHospital(
        amb,
        candidates,
        requiredSpecialty,
        amb.severity,
        routingOptionsRef.current
      )
      if (!result) return null

      await updateAmbulance(ambulanceId, {
        assigned_hospital_id: result.hospital.id,
        er_status: 'diverted',
        erStatus: 'diverted',
      })

      onRerouteRef.current?.(
        amb.id,
        fromName,
        `${result.hospital.name}${reason ? ` (${reason})` : ''}`
      )

      return result
    },
    [updateAmbulance, requiredSpecialty]
  )

  // ── Accept Incoming Ambulance ────────────────────────────────────────────
  /**
   * Hospital staff accepts incoming ambulance arrival.
   */
  const acceptAmbulance = useCallback(
    async (ambulanceId: string): Promise<void> => {
      await updateAmbulance(ambulanceId, {
        er_status: 'accepted',
        erStatus: 'accepted',
      })
    },
    [updateAmbulance]
  )

  return { dispatchAmbulance, divertAmbulance, acceptAmbulance }
}
