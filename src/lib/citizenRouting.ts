import { Hospital } from '@/types'
import { scoreHospital, ScoreBreakdown } from '@/lib/routing'

// A citizen "origin" shaped like an Ambulance for the scoring function
function citizenAsAmbulance(lat: number, lng: number) {
  return {
    id: 'CITIZEN',
    lat,
    lng,
    status: 'idle' as const,
    assigned_hospital_id: null,
  }
}

export interface CitizenHospitalResult {
  hospital: Hospital
  breakdown: ScoreBreakdown
  distanceKm: number
  estMinutes: number          // straight-line ETA estimate
  availabilityLabel: 'Available' | 'Limited' | 'At Capacity'
  availabilityColor: 'green' | 'amber' | 'red'
  reasonText: string
}

// Average ambulance speed assumption for ETA
const AVG_SPEED_KMH = 40

function getAvailabilityLabel(capPct: number): CitizenHospitalResult['availabilityLabel'] {
  if (capPct >= 95) return 'At Capacity'
  if (capPct >= 70) return 'Limited'
  return 'Available'
}

function getAvailabilityColor(capPct: number): CitizenHospitalResult['availabilityColor'] {
  if (capPct >= 95) return 'red'
  if (capPct >= 70) return 'amber'
  return 'green'
}

function buildReasonText(
  breakdown: ScoreBreakdown,
  hospital: Hospital,
  requiredSpecialty?: string | null
): string {
  const distFmt = breakdown.distanceKm.toFixed(1)
  const capPct  = Math.round(breakdown.capacityPct)
  const specialties = hospital.specialties.slice(0, 2).join(', ')

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
 */
export function rankHospitalsForCitizen(
  lat: number,
  lng: number,
  hospitals: Hospital[],
  requiredSpecialty?: string | null,
  limit = 3
): CitizenHospitalResult[] {
  if (hospitals.length === 0) return []

  const origin = citizenAsAmbulance(lat, lng)

  const scored: CitizenHospitalResult[] = hospitals.map((h) => {
    const breakdown: ScoreBreakdown = scoreHospital(origin, h, hospitals, requiredSpecialty)
    const capPct = h.total_beds > 0 ? (h.occupied_beds / h.total_beds) * 100 : 0
    const estMinutes = Math.max(1, Math.round((breakdown.distanceKm / AVG_SPEED_KMH) * 60))

    return {
      hospital: h,
      breakdown,
      distanceKm: breakdown.distanceKm,
      estMinutes,
      availabilityLabel: getAvailabilityLabel(capPct),
      availabilityColor: getAvailabilityColor(capPct),
      reasonText: buildReasonText(breakdown, h, requiredSpecialty),
    }
  })

  // Sort by score desc, at-capacity hospitals pushed to bottom
  scored.sort((a, b) => {
    if (a.breakdown.excluded && !b.breakdown.excluded) return 1
    if (!a.breakdown.excluded && b.breakdown.excluded) return -1
    return b.breakdown.total - a.breakdown.total
  })

  return scored.slice(0, limit)
}
