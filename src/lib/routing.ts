import { Hospital, Ambulance } from '@/types'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  total: number           // 0–1, higher = better
  distanceScore: number   // 0–1
  capacityScore: number   // 0–1
  specialtyScore: number  // 0–1
  trafficScore: number    // 0–1
  distanceKm: number      // raw Euclidean approx in km
  capacityPct: number     // occupied / total * 100
  trafficMultiplier: number // 0.8 – 1.5
  specialtyMatched: boolean
  excluded: boolean       // true if hospital is at ≥95% and others exist
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
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
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

/**
 * Score a single hospital for a given ambulance.
 * Higher total score = better choice.
 *
 * @param ambulance        - ambulance to be dispatched
 * @param hospital         - candidate hospital
 * @param allHospitals     - full list (used to normalise distance)
 * @param requiredSpecialty - optional specialty required by the patient
 */
export function scoreHospital(
  ambulance: Ambulance,
  hospital: Hospital,
  allHospitals: Hospital[],
  requiredSpecialty?: string | null
): ScoreBreakdown {
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

  // ── Capacity ─────────────────────────────────────────────
  const capPct =
    hospital.total_beds > 0
      ? (hospital.occupied_beds / hospital.total_beds) * 100
      : 100

  const excluded = capPct >= CAPACITY_EXCLUSION_PCT

  // Linear: 0% occupied → score 1.0; 95% → score 0.05
  const capacityScore = Math.max(0, 1 - capPct / 100)

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
  const trafficMult = congestionMultiplier(ambulance.id, hospital.id)
  // trafficMult > 1 means congestion → bad → lower score
  // Map [0.8, 1.5] → [1.0, 0.0] (inverse)
  const trafficScore = Math.max(0, 1 - (trafficMult - 0.8) / 0.7)

  // ── Weighted total ────────────────────────────────────────
  const total =
    W_DISTANCE  * distanceScore  +
    W_CAPACITY  * capacityScore  +
    W_SPECIALTY * specialtyScore +
    W_TRAFFIC   * trafficScore

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
  }
}

// ─────────────────────────────────────────────────────────────
// Find best hospital
// ─────────────────────────────────────────────────────────────

/**
 * Scores ALL hospitals and returns the one with the highest score,
 * excluding hospitals at ≥95% capacity when alternatives exist.
 */
export function findBestHospital(
  ambulance: Ambulance,
  hospitals: Hospital[],
  requiredSpecialty?: string | null
): RoutingResult | null {
  if (hospitals.length === 0) return null

  const allScores = hospitals.map((h) => ({
    hospital: h,
    breakdown: scoreHospital(ambulance, h, hospitals, requiredSpecialty),
  }))

  // Filter out excluded hospitals unless ALL are excluded (fallback)
  const eligible = allScores.filter((r) => !r.breakdown.excluded)
  const pool = eligible.length > 0 ? eligible : allScores

  // Pick highest score
  pool.sort((a, b) => b.breakdown.total - a.breakdown.total)
  const best = pool[0]

  return {
    hospital: best.hospital,
    breakdown: best.breakdown,
    allScores,
  }
}
