import { Hospital, Ambulance, EmergencySeverity } from '@/types'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  total: number           // 0–1, higher = better
  distanceScore: number   // 0–1
  capacityScore: number   // 0–1
  specialtyScore: number  // 0–1
  trafficScore: number    // 0–1
  distanceKm: number      // raw Euclidean approx in km (always present)
  capacityPct: number     // occupied / total * 100
  trafficMultiplier: number // 0.8 – 1.5
  specialtyMatched: boolean
  excluded: boolean
  resourceExcluded: boolean
  /** Driving distance in km from OSRM when available; undefined otherwise */
  roadDistanceKm?: number
  /** Driving duration in minutes from OSRM when available; undefined otherwise */
  roadDurationMinutes?: number
}

export interface RoutingResult {
  hospital: Hospital
  breakdown: ScoreBreakdown
  allScores: { hospital: Hospital; breakdown: ScoreBreakdown }[]
}

// ─────────────────────────────────────────────────────────────
// Weights (must sum to 1.0)
// ─────────────────────────────────────────────────────────────
const W_DISTANCE  = 0.40
const W_CAPACITY  = 0.35
const W_SPECIALTY = 0.15
const W_TRAFFIC   = 0.10

// Jaipur latitude – used for crude km conversion
const KM_PER_DEG = 111.0

// Threshold above which a hospital is excluded from routing
const CAPACITY_EXCLUSION_PCT = 95

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Straight-line distance in approximate km between two lat/lng points. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = (bLat - aLat) * KM_PER_DEG
  const dLng = (bLng - aLng) * KM_PER_DEG * Math.cos((aLat * Math.PI) / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

/**
 * Seeded pseudo-random congestion multiplier (0.8 – 1.5).
 * Uses ambulance id + hospital id as seed so it's stable per pair during
 * a session, but differs across pairs.
 */
function congestionMultiplier(ambulanceId: string, hospitalId: string): number {
  let hash = 0
  const str = ambulanceId + hospitalId + String(Date.now()).slice(-5)
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  // Map to [0.8, 1.5]
  return 0.8 + ((hash % 700) / 1000)
}

// ─────────────────────────────────────────────────────────────
// Core scoring function
// ─────────────────────────────────────────────────────────────

export interface RoutingOptions {
  requiresIcu?: boolean
  requiresVentilator?: boolean
  trafficZones?: CongestionZone[]
}

export interface CongestionZone {
  id: string
  name: string
  lat: number
  lng: number
  radiusKm: number
  delayMultiplier: number
}

function distanceToRouteKm(
  pointLat: number,
  pointLng: number,
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): number {
  const longitudeScale = KM_PER_DEG * Math.cos((pointLat * Math.PI) / 180)
  const startX = (startLng - pointLng) * longitudeScale
  const startY = (startLat - pointLat) * KM_PER_DEG
  const endX = (endLng - pointLng) * longitudeScale
  const endY = (endLat - pointLat) * KM_PER_DEG
  const segmentX = endX - startX
  const segmentY = endY - startY
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY
  const projection = segmentLengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, -(startX * segmentX + startY * segmentY) / segmentLengthSquared))
  const closestX = startX + projection * segmentX
  const closestY = startY + projection * segmentY
  return Math.sqrt(closestX * closestX + closestY * closestY)
}

/**
 * Score a single hospital for a given ambulance.
 * Higher total score = better choice.
 *
 * @param ambulance        - ambulance to be dispatched
 * @param hospital         - candidate hospital
 * @param allHospitals     - full list (used to normalise distance)
 * @param requiredSpecialty - optional specialty required by the patient
 * @param severity         - emergency triage severity level
 * @param options          - optional resource requirements (requiresIcu, requiresVentilator)
 */
export function scoreHospital(
  ambulance: Ambulance,
  hospital: Hospital,
  allHospitals: Hospital[],
  requiredSpecialty?: string | null,
  severity?: EmergencySeverity | null,
  options?: RoutingOptions
): ScoreBreakdown {
  const effectiveSeverity: EmergencySeverity =
    severity || ambulance.severity || 'moderate'

  // ── Distance ──────────────────────────────────────────────
  const dKm = distanceKm(ambulance.lat, ambulance.lng, hospital.lat, hospital.lng)

  // Normalise: find the farthest hospital in the city to use as reference
  const maxDist = Math.max(
    ...allHospitals.map((h) =>
      distanceKm(ambulance.lat, ambulance.lng, h.lat, h.lng)
    ),
    1
  )
  // Score is inverted (closer = higher score)
  const distanceScore = 1 - Math.min(dKm / maxDist, 1)

  // ── Capacity & ICU / Ventilator Availability ──────────────
  const capPct =
    hospital.total_beds > 0
      ? (hospital.occupied_beds / hospital.total_beds) * 100
      : 100

  const totalIcuBeds = hospital.icuBedsTotal ?? hospital.icu_beds
  // Factor in active reservations so subsequent dispatches don't overbook
  const reservedIcu = hospital.reserved_icu_beds ?? 0
  const availableIcu = Math.max(0, (hospital.icuBedsAvailable ?? 0) - reservedIcu)
  const availableVentilators = hospital.ventilatorsAvailable
  const requiresIcu = options?.requiresIcu || effectiveSeverity === 'critical'
  const requiresVentilator = options?.requiresVentilator || effectiveSeverity === 'critical'
  const resourceExcluded =
    (requiresIcu && availableIcu <= 0) ||
    (requiresVentilator && availableVentilators <= 0)

  // Critical cases can use a hospital with high overall occupancy when it has
  // the required critical-care resources, but resource requirements stay hard constraints.
  const capacityExcluded =
    capPct >= CAPACITY_EXCLUSION_PCT &&
    !(effectiveSeverity === 'critical' && availableIcu > 0)
  const excluded = resourceExcluded || capacityExcluded

  const icuCapPct =
    totalIcuBeds > 0
      ? ((totalIcuBeds - availableIcu) / totalIcuBeds) * 100
      : 100

  // Linear general capacity: 0% occupied → score 1.0; 95% → score 0.05
  const generalCapacityScore = Math.max(0, 1 - capPct / 100)
  const icuScore = totalIcuBeds > 0 ? Math.max(0, 1 - icuCapPct / 100) : 0

  // For critical severity, weight ICU capacity heavily
  const capacityScore =
    effectiveSeverity === 'critical' && totalIcuBeds > 0
      ? icuScore * 0.7 + generalCapacityScore * 0.3
      : generalCapacityScore

  // ── Specialty ────────────────────────────────────────────
  let specialtyScore = 0.5  // neutral when no specialty required
  let specialtyMatched = false

  if (requiredSpecialty) {
    specialtyMatched = hospital.specialties.some(
      (s) => s.toLowerCase() === requiredSpecialty.toLowerCase()
    )
    specialtyScore = specialtyMatched ? 1.0 : 0.05 // heavy penalty for mismatch
  }

  // ── Traffic / Congestion ─────────────────────────────────
  const baseTrafficMult = congestionMultiplier(ambulance.id, hospital.id)
  const routeDelayMultiplier = (options?.trafficZones ?? []).reduce((maxDelay, zone) => {
    const intersectsRoute =
      distanceToRouteKm(zone.lat, zone.lng, ambulance.lat, ambulance.lng, hospital.lat, hospital.lng) <=
      zone.radiusKm
    return intersectsRoute ? Math.max(maxDelay, zone.delayMultiplier) : maxDelay
  }, 1)
  const trafficMult = Math.min(3.5, baseTrafficMult + routeDelayMultiplier - 1)
  const trafficScore = Math.max(0, 1 - (trafficMult - 0.8) / 2.7)

  // ── Weighted total ────────────────────────────────────────
  // Critical cases strictly prioritize bed/ICU capacity over distance
  let wDist = W_DISTANCE
  let wCap = W_CAPACITY
  let wSpec = W_SPECIALTY
  let wTraf = W_TRAFFIC

  if (effectiveSeverity === 'critical') {
    wDist = 0.15
    wCap = 0.60  // Strictly prioritize capacity & ICU readiness
    wSpec = 0.15
    wTraf = 0.10
  } else if (effectiveSeverity === 'minor') {
    wDist = 0.55 // Proximity is primary for minor conditions
    wCap = 0.25
    wSpec = 0.10
    wTraf = 0.10
  }

  const total =
    wDist * distanceScore  +
    wCap  * capacityScore  +
    wSpec * specialtyScore +
    wTraf * trafficScore

  return {
    total,
    distanceScore,
    capacityScore,
    specialtyScore,
    trafficScore,
    distanceKm: dKm,
    capacityPct: capPct,
    trafficMultiplier: trafficMult,
    specialtyMatched,
    excluded,
    resourceExcluded,
  }
}

// ─────────────────────────────────────────────────────────────
// Find best hospital
// ─────────────────────────────────────────────────────────────

/**
 * Scores ALL hospitals and returns the one with the highest score,
 * excluding hospitals at ≥95% capacity when alternatives exist.
 *
 * @param options - optional resource requirements (requiresIcu, requiresVentilator)
 */
export function findBestHospital(
  ambulance: Ambulance,
  hospitals: Hospital[],
  requiredSpecialty?: string | null,
  severity?: EmergencySeverity | null,
  options?: RoutingOptions
): RoutingResult | null {
  if (hospitals.length === 0) return null

  const allScores = hospitals.map((h) => ({
    hospital: h,
    breakdown: scoreHospital(ambulance, h, hospitals, requiredSpecialty, severity, options),
  }))

  // Never route to a hospital that cannot meet a required resource. Capacity
  // exclusions may fall back only when every resource-compatible option is full.
  const resourceCompatible = allScores.filter((r) => !r.breakdown.resourceExcluded)
  if (resourceCompatible.length === 0) return null

  const eligible = resourceCompatible.filter((r) => !r.breakdown.excluded)
  const pool = eligible.length > 0 ? eligible : resourceCompatible

  // Pick highest score
  pool.sort((a, b) => b.breakdown.total - a.breakdown.total)
  const best = pool[0]

  return {
    hospital: best.hospital,
    breakdown: best.breakdown,
    allScores,
  }
}
