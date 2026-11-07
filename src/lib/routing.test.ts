import { describe, it, expect } from 'vitest'
import { distanceKm, scoreHospital, findBestHospital } from './routing'
import { Hospital, Ambulance } from '@/types'

describe('routing.ts', () => {
  const dummyAmbulance: Ambulance = {
    id: 'AMB-TEST',
    lat: 26.9124,
    lng: 75.7873,
    status: 'idle',
    assigned_hospital_id: null,
    severity: 'moderate',
  }

  const dummyHospitals: Hospital[] = [
    {
      id: 'hosp-1',
      name: 'Central Hospital',
      lat: 26.9150,
      lng: 75.7890,
      total_beds: 100,
      occupied_beds: 50,
      icu_beds: 10,
      icu_occupied: 2,
      icuBedsTotal: 10,
      icuBedsAvailable: 8,
      ventilatorsAvailable: 4,
      oxygenStatus: 'sufficient',
      specialties: ['Cardiology', 'Emergency Care'],
      status: 'operational',
    },
    {
      id: 'hosp-2',
      name: 'North Trauma Care',
      lat: 26.9500,
      lng: 75.8200,
      total_beds: 50,
      occupied_beds: 49, // 98% occupied (over capacity exclusion threshold)
      icu_beds: 5,
      icu_occupied: 5,
      icuBedsTotal: 5,
      icuBedsAvailable: 0,
      ventilatorsAvailable: 0,
      oxygenStatus: 'low',
      specialties: ['Trauma', 'Emergency Care'],
      status: 'critical',
    },
    {
      id: 'hosp-3',
      name: 'South Specialty Hospital',
      lat: 26.8500,
      lng: 75.7500,
      total_beds: 80,
      occupied_beds: 10, // Very low occupancy, specialized
      icu_beds: 15,
      icu_occupied: 3,
      icuBedsTotal: 15,
      icuBedsAvailable: 12,
      ventilatorsAvailable: 8,
      oxygenStatus: 'sufficient',
      specialties: ['Neurology', 'Cardiology'],
      status: 'operational',
    },
  ]

  it('calculates distanceKm correctly for known points', () => {
    const dist = distanceKm(26.9124, 75.7873, 26.9150, 75.7890)
    expect(dist).toBeGreaterThan(0)
    expect(dist).toBeLessThan(1) // Under 1 km away
  })

  it('calculates routing scores and accounts for capacity', () => {
    const score1 = scoreHospital(dummyAmbulance, dummyHospitals[0], dummyHospitals)
    expect(score1.excluded).toBe(false)
    expect(score1.capacityPct).toBe(50)
    expect(score1.total).toBeGreaterThan(0)

    const score2 = scoreHospital(dummyAmbulance, dummyHospitals[1], dummyHospitals)
    expect(score2.capacityPct).toBe(98)
    expect(score2.excluded).toBe(true) // Excluded due to >95% capacity
  })

  it('rewards specialty match in the score breakdown', () => {
    const score1 = scoreHospital(dummyAmbulance, dummyHospitals[0], dummyHospitals, 'Neurology')
    const score3 = scoreHospital(dummyAmbulance, dummyHospitals[2], dummyHospitals, 'Neurology')
    expect(score1.specialtyMatched).toBe(false)
    expect(score3.specialtyMatched).toBe(true)
    expect(score3.specialtyScore).toBeGreaterThan(score1.specialtyScore)
  })

  it('excludes hospitals lacking ICU or Ventilators when required', () => {
    const res = findBestHospital(dummyAmbulance, dummyHospitals, null, 'critical', {
      requiresIcu: true,
      requiresVentilator: true,
    })
    expect(res).not.toBeNull()
    expect(res?.hospital.id).not.toBe('hosp-2') // hosp-2 has 0 available ICU/vents
  })

  it('selects the closest eligible hospital when other metrics are balanced', () => {
    const res = findBestHospital(dummyAmbulance, dummyHospitals)
    expect(res).not.toBeNull()
    expect(res?.hospital.id).toBe('hosp-1')
  })
})
