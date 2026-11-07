import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { getRoadRoute } from './osrm'

const server = setupServer(
  http.get('https://router.project-osrm.org/route/v1/driving/:coords', () => {
    return HttpResponse.json({
      code: 'Ok',
      routes: [
        {
          distance: 5200, // 5.2 km
          duration: 480,  // 8 mins
          geometry: {
            coordinates: [
              [75.7873, 26.9124],
              [75.7890, 26.9150],
            ],
          },
        },
      ],
    })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('osrm.ts', () => {
  it('successfully fetches road route via MSW mock', async () => {
    const route = await getRoadRoute([26.9124, 75.7873], [26.9150, 75.7890])
    expect(route.isRoadRoute).toBe(true)
    expect(route.distanceKm).toBeCloseTo(5.2, 1)
    expect(route.durationMinutes).toBeCloseTo(8, 1)
    expect(route.geometryCoordinates).toBeDefined()
    expect(route.geometryCoordinates?.length).toBe(2)
  })

  it('gracefully falls back to straight-line Euclidean distance if API fails', async () => {
    server.use(
      http.get('https://router.project-osrm.org/route/v1/driving/:coords', () => {
        return HttpResponse.error()
      })
    )

    const route = await getRoadRoute([26.9124, 75.7873], [26.9150, 75.7890])
    expect(route.isRoadRoute).toBe(false)
    expect(route.distanceKm).toBeGreaterThan(0)
    expect(route.durationMinutes).toBeGreaterThan(0)
  })
})
