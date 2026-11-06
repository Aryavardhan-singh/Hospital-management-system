// ─────────────────────────────────────────────────────────────
// OSRM Road Routing Utility
// ─────────────────────────────────────────────────────────────
// Uses the public OSRM demo server for real driving-route data.
// Falls back gracefully to straight-line Euclidean distance if
// the request fails, times out, or returns an error.
// ─────────────────────────────────────────────────────────────

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'
const FETCH_TIMEOUT_MS = 5000

/** Result shape returned by getRoadRoute */
export interface RoadRouteResult {
  /** Driving distance in metres */
  distanceMetres: number
  /** Driving distance in kilometres */
  distanceKm: number
  /** Driving duration in seconds */
  durationSeconds: number
  /** Driving duration in minutes */
  durationMinutes: number
  /** true when the value came from OSRM, false when it is a straight-line fallback */
  isRoadRoute: boolean
}

// ── Fallback: straight-line Euclidean distance ────────────────
const KM_PER_DEG = 111.0

function straightLineKm(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): number {
  const dLat = (endLat - startLat) * KM_PER_DEG
  const dLng = (endLng - startLng) * KM_PER_DEG * Math.cos((startLat * Math.PI) / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

/** Assumed average ambulance speed for straight-line ETA fallback (km/h) */
const FALLBACK_SPEED_KMH = 40

function makeFallback(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): RoadRouteResult {
  const distanceKm = straightLineKm(startLat, startLng, endLat, endLng)
  const distanceMetres = distanceKm * 1000
  const durationSeconds = (distanceKm / FALLBACK_SPEED_KMH) * 3600
  const durationMinutes = durationSeconds / 60
  return { distanceMetres, distanceKm, durationSeconds, durationMinutes, isRoadRoute: false }
}

/**
 * Fetches a real driving route from the OSRM public API.
 *
 * @param start - [latitude, longitude] of the origin
 * @param end   - [latitude, longitude] of the destination
 * @returns RoadRouteResult with driving distance + ETA, or a straight-line
 *          fallback if the network request fails or times out.
 */
export async function getRoadRoute(
  start: [number, number],
  end: [number, number]
): Promise<RoadRouteResult> {
  const [startLat, startLng] = start
  const [endLat, endLng] = end

  // OSRM expects longitude,latitude order
  const url = `${OSRM_BASE}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      return makeFallback(startLat, startLng, endLat, endLng)
    }

    const data = await response.json()

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return makeFallback(startLat, startLng, endLat, endLng)
    }

    const route = data.routes[0]
    const distanceMetres: number = route.distance   // metres
    const durationSeconds: number = route.duration  // seconds

    return {
      distanceMetres,
      distanceKm: distanceMetres / 1000,
      durationSeconds,
      durationMinutes: durationSeconds / 60,
      isRoadRoute: true,
    }
  } catch {
    // Network error, timeout (AbortError), or JSON parse failure
    return makeFallback(startLat, startLng, endLat, endLng)
  }
}
