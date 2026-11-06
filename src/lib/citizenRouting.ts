import { Hospital, EmergencySeverity } from '@/types'
import { scoreHospital, ScoreBreakdown, RoutingOptions } from '@/lib/routing'
import { getRoadRoute } from '@/lib/osrm'

// A citizen "origin" shaped like an Ambulance for the scoring function
function citizenAsAmbulance(lat: number, lng: number, severity: EmergencySeverity = 'moderate') {
  return {
    id: 'CITIZEN',
    lat,
    lng,
    status: 'idle' as const,
    assigned_hospital_id: null,
    severity,
  }
}

export interface CitizenHospitalResult {
  hospital: Hospital
  breakdown: ScoreBreakdown
  distanceKm: number
  estMinutes: number          // ETA in minutes (road-based when available, straight-line otherwise)
  availabilityLabel: 'Available' | 'Limited' | 'At Capacity'
  availabilityColor: 'green' | 'amber' | 'red'
  reasonText: string
}

// Average ambulance speed assumption for straight-line ETA fallback
const AVG_SPEED_KMH = 40

function getAvailabilityLabel(
  capPct: number,
  availableIcu = 0,
  isCritical = false
): CitizenHospitalResult['availabilityLabel'] {
  // Critical cases bypass low-capacity warnings if an ICU bed is available
  if (isCritical && availableIcu > 0) return 'Available'
  if (capPct >= 95) return 'At Capacity'
  if (capPct >= 70) return 'Limited'
  return 'Available'
}

function getAvailabilityColor(
  capPct: number,
  availableIcu = 0,
  isCritical = false
): CitizenHospitalResult['availabilityColor'] {
  if (isCritical && availableIcu > 0) return 'green'
  if (capPct >= 95) return 'red'
  if (capPct >= 70) return 'amber'
  return 'green'
}

function buildReasonText(
  breakdown: ScoreBreakdown,
  hospital: Hospital,
  requiredSpecialty?: string | null,
  severity: EmergencySeverity = 'moderate'
): string {
  const distFmt = breakdown.distanceKm.toFixed(1)
  const capPct  = Math.round(breakdown.capacityPct)
  const specialties = hospital.specialties.slice(0, 2).join(', ')
  const availableIcu = Math.max(0, hospital.icu_beds - hospital.icu_occupied)

  if (severity === 'critical') {
    if (availableIcu > 0) {
      return `Critical Care Ready · ${availableIcu} ICU beds available · Priority bed allocation · ${distFmt} km`
    }
    return `High-acuity facility · ${specialties} · ${distFmt} km away`
  }

  if (requiredSpecialty && breakdown.specialtyMatched) {
    return `Nearest with ${requiredSpecialty} specialty · ${distFmt} km · ${capPct}% capacity`
  }
  if (capPct < 50) {
    return `High bed availability (${capPct}% capacity) · ${distFmt} km away`
  }
  if (breakdown.distanceScore > 0.75) {
    return `Closest facility · ${distFmt} km · Specialties: ${specialties}`
  }
  return `Best overall score: ${distFmt} km, ${capPct}% capacity, low congestion`
}

/**
 * Ranks all hospitals for a citizen at (lat, lng) using the smart routing
 * scoring function and returns the top `limit` results.
 *
 * Supports emergency severity level: 'critical' strictly prioritizes bed/ICU
 * capacity over distance and bypasses low-capacity warnings when ICU beds exist.
 *
 * @param options - optional resource requirements (requiresIcu, requiresVentilator)
 */
export function rankHospitalsForCitizen(
  lat: number,
  lng: number,
  hospitals: Hospital[],
  requiredSpecialty?: string | null,
  limit = 3,
  severity: EmergencySeverity = 'moderate',
  options?: RoutingOptions
): CitizenHospitalResult[] {
  if (hospitals.length === 0) return []

  const origin = citizenAsAmbulance(lat, lng, severity)
  const isCritical = severity === 'critical'

  const scored: CitizenHospitalResult[] = hospitals.map((h) => {
    const breakdown: ScoreBreakdown = scoreHospital(origin, h, hospitals, requiredSpecialty, severity, options)
    const capPct = h.total_beds > 0 ? (h.occupied_beds / h.total_beds) * 100 : 0
    const availableIcu = h.icuBedsAvailable
    const estMinutes = Math.max(1, Math.round((breakdown.distanceKm / AVG_SPEED_KMH) * 60))

    return {
      hospital: h,
      breakdown,
      distanceKm: breakdown.distanceKm,
      estMinutes,
      availabilityLabel: getAvailabilityLabel(capPct, availableIcu, isCritical),
      availabilityColor: getAvailabilityColor(capPct, availableIcu, isCritical),
      reasonText: buildReasonText(breakdown, h, requiredSpecialty, severity),
    }
  })

  // Hospitals lacking explicitly required resources are not recommendations.
  const resourceCompatible = scored.filter((result) => !result.breakdown.resourceExcluded)

  // Sort by score desc, at-capacity hospitals pushed to bottom unless critical with ICU.
  resourceCompatible.sort((a, b) => {
    if (a.breakdown.excluded && !b.breakdown.excluded) return 1
    if (!a.breakdown.excluded && b.breakdown.excluded) return -1
    return b.breakdown.total - a.breakdown.total
  })

  return resourceCompatible.slice(0, limit)
}

/**
 * Enriches a ranked result list with real driving distances and durations
 * from the OSRM API. Returns a new array; the originals are not mutated.
 *
 * Falls back gracefully per-entry if OSRM is unavailable for that pair.
 */
export async function enrichWithRoadRoutes(
  lat: number,
  lng: number,
  results: CitizenHospitalResult[]
): Promise<CitizenHospitalResult[]> {
  const enriched = await Promise.all(
    results.map(async (r) => {
      try {
        const route = await getRoadRoute([lat, lng], [r.hospital.lat, r.hospital.lng])

        if (route.isRoadRoute) {
          // Replace ETA with real driving duration, attach road distances to breakdown
          const updatedBreakdown: ScoreBreakdown = {
            ...r.breakdown,
            roadDistanceKm: route.distanceKm,
            roadDurationMinutes: route.durationMinutes,
          }
          return {
            ...r,
            breakdown: updatedBreakdown,
            distanceKm: route.distanceKm,
            estMinutes: Math.max(1, Math.round(route.durationMinutes)),
          }
        }
      } catch {
        // Any unexpected error — keep original result
      }
      return r
    })
  )
  return enriched
}
