import { describe, it, expect } from 'vitest'
import { rankHospitalsForCitizen } from './citizenRouting'
import { Hospital } from '@/types'

describe('citizenRouting.ts', () => {
  const dummyHospitals: Hospital[] = [
    {
      id: 'hosp-near-busy',
      name: 'Near Busy Hospital',
      lat: 26.9130,
      lng: 75.7880,
      total_beds: 100,
      occupied_beds: 96, // At capacity (>95%)
      icu_beds: 10,
      icu_occupied: 10,
      icuBedsTotal: 10,
      icuBedsAvailable: 0,
      ventilatorsAvailable: 0,
      oxygenStatus: 'low',
      specialties: ['General Medicine'],
      status: 'critical',
    },
    {
      id: 'hosp-far-free',
      name: 'Far Free Hospital',
      lat: 26.8500,
      lng: 75.7500,
      total_beds: 200,
      occupied_beds: 50, // 25% capacity
      icu_beds: 20,
      icu_occupied: 5,
      icuBedsTotal: 20,
      icuBedsAvailable: 15,
      ventilatorsAvailable: 8,
      oxygenStatus: 'sufficient',
      specialties: ['Cardiology', 'Emergency Care'],
      status: 'operational',
    },
    {
      id: 'hosp-moderate',
      name: 'Moderate Hospital',
      lat: 26.9180,
      lng: 75.7900,
      total_beds: 100,
      occupied_beds: 75, // 75% capacity -> Limited
      icu_beds: 10,
      icu_occupied: 2,
      icuBedsTotal: 10,
      icuBedsAvailable: 8,
      ventilatorsAvailable: 4,
      oxygenStatus: 'sufficient',
      specialties: ['Emergency Care'],
      status: 'busy',
    },
  ]

  it('ranks hospitals for citizen and assigns correct availability statuses', () => {
    const results = rankHospitalsForCitizen(
      26.9124,
      75.7873,
      dummyHospitals,
      null,
      10,
      'moderate'
    )

    expect(results.length).toBe(3)
    const nearBusy = results.find(r => r.hospital.id === 'hosp-near-busy')
    expect(nearBusy?.availabilityLabel).toBe('At Capacity')
    expect(nearBusy?.availabilityColor).toBe('red')

    const moderate = results.find(r => r.hospital.id === 'hosp-moderate')
    expect(moderate?.availabilityLabel).toBe('Limited')
    expect(moderate?.availabilityColor).toBe('amber')

    const farFree = results.find(r => r.hospital.id === 'hosp-far-free')
    expect(farFree?.availabilityLabel).toBe('Available')
    expect(farFree?.availabilityColor).toBe('green')
  })

  it('calculates straight-line ETA properly', () => {
    const results = rankHospitalsForCitizen(
      26.9124,
      75.7873,
      dummyHospitals
    )

    for (const res of results) {
      expect(res.estMinutes).toBeGreaterThan(0)
      expect(res.distanceKm).toBeGreaterThan(0)
    }
  })
})
