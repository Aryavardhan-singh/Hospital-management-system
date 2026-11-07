export interface DiscoveredFacility {
  id: string
  name: string
  category: string
  lat: number
  lng: number
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter',
]
const REQUEST_TIMEOUT_MS = 25_000
const ENDPOINT_TIMEOUT_MS = 6_000

export async function fetchNearbyFacilities(
  latitude: number,
  longitude: number,
  radiusMetres = 15_000,
  signal?: AbortSignal
): Promise<DiscoveredFacility[]> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('A valid map center is required to search nearby facilities.')
  }

  const query = `[out:json][timeout:15];(
    nwr(around:${radiusMetres},${latitude},${longitude})["amenity"="hospital"];
    nwr(around:${radiusMetres},${latitude},${longitude})["amenity"="clinic"];
    nwr(around:${radiusMetres},${latitude},${longitude})["healthcare"~"^(hospital|clinic)$"];
    nwr(around:${radiusMetres},${latitude},${longitude})["emergency"="ambulance_station"];
  );out center tags;`
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const abortRequest = () => controller.abort()
  signal?.addEventListener('abort', abortRequest, { once: true })

  try {
    let response: Response | null = null
    let lastError: Error | null = null

    for (const endpoint of OVERPASS_ENDPOINTS) {
      const endpointController = new AbortController()
      const abortEndpoint = () => endpointController.abort()
      controller.signal.addEventListener('abort', abortEndpoint, { once: true })
      const endpointTimeoutId = window.setTimeout(
        () => endpointController.abort(),
        ENDPOINT_TIMEOUT_MS
      )

      try {
        const candidate = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
          signal: endpointController.signal,
        })
        if (!candidate.ok) {
          throw new Error(`OpenStreetMap facility search returned HTTP ${candidate.status}.`)
        }
        response = candidate
        break
      } catch (error) {
        if (controller.signal.aborted) throw error
        lastError = error instanceof Error ? error : new Error(String(error))
      } finally {
        window.clearTimeout(endpointTimeoutId)
        controller.signal.removeEventListener('abort', abortEndpoint)
      }
    }

    if (!response) {
      throw new Error(lastError?.message ?? 'All OpenStreetMap facility services are unavailable.')
    }

    const result = await response.json() as {
      elements?: Array<{
        id: number
        type: string
        lat?: number
        lon?: number
        center?: { lat: number; lon: number }
        tags?: Record<string, string>
      }>
    }

    const seen = new Set<string>()
    return (result.elements ?? []).flatMap((element) => {
      const latitude = element.lat ?? element.center?.lat
      const longitude = element.lon ?? element.center?.lon
      if (latitude == null || longitude == null) return []

      const id = `${element.type}/${element.id}`
      if (seen.has(id)) return []
      seen.add(id)

      const tags = element.tags ?? {}
      const category = tags.emergency ?? tags.amenity ?? tags.healthcare ?? 'facility'
      return [{
        id,
        name: tags.name ?? tags['name:en'] ?? category.replaceAll('_', ' '),
        category,
        lat: latitude,
        lng: longitude,
      }]
    })
  } finally {
    window.clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abortRequest)
  }
}
