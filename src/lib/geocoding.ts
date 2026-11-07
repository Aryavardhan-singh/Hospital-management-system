// Simple in-memory cache to prevent redundant reverse-geocoding calls
const geocodeCache = new Map<string, string>()

/**
 * Reverse geocodes latitude & longitude into a human-friendly address string.
 * Uses OpenStreetMap Nominatim with a timeout and graceful coordinate fallback.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500)

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MedNet-HospitalOps-System/1.0',
      },
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      if (data && data.display_name) {
        // Extract road, suburb, or city to produce a concise human-readable address
        const address = data.address || {}
        const main = address.road || address.neighbourhood || address.suburb || address.residential || ''
        const city = address.city || address.town || address.county || 'Jaipur'
        const landmark = address.amenity || address.shop || address.building || ''

        let friendly = ''
        if (landmark && main) {
          friendly = `${landmark}, ${main}, ${city}`
        } else if (main) {
          friendly = `${main}, ${city}`
        } else {
          friendly = data.display_name.split(',').slice(0, 3).join(',').trim()
        }

        if (friendly) {
          geocodeCache.set(cacheKey, friendly)
          return friendly
        }
      }
    }
  } catch {
    // Fail silently to coordinate fallback
  }

  // Graceful fallback to formatted coordinates
  const fallback = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E (Jaipur)`
  geocodeCache.set(cacheKey, fallback)
  return fallback
}
