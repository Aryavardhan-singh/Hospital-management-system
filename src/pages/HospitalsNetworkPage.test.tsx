import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { HospitalsNetworkPage } from './HospitalsNetworkPage'
import { Hospital, Ambulance } from '@/types'

const mockHospitals: Hospital[] = [
  {
    id: 'hosp-1',
    name: 'Apex Hospital',
    lat: 26.9124,
    lng: 75.7873,
    total_beds: 100,
    occupied_beds: 45,
    icu_beds: 10,
    icu_occupied: 2,
    icuBedsTotal: 10,
    icuBedsAvailable: 8,
    ventilatorsAvailable: 5,
    oxygenStatus: 'sufficient',
    specialties: ['Cardiology'],
    status: 'operational',
  },
  {
    id: 'hosp-2',
    name: 'Fortis Escorts Hospital',
    lat: 26.92,
    lng: 75.795,
    total_beds: 180,
    occupied_beds: 135,
    icu_beds: 20,
    icu_occupied: 15,
    icuBedsTotal: 20,
    icuBedsAvailable: 5,
    ventilatorsAvailable: 2,
    oxygenStatus: 'low',
    specialties: ['Trauma'],
    status: 'busy',
  },
]

const mockAmbulances: Ambulance[] = []

vi.mock('@/hooks/useSupabaseData', () => ({
  useSupabaseData: () => ({
    hospitals: mockHospitals,
    ambulances: mockAmbulances,
    loading: false,
    isLive: true,
    isSeeding: false,
    refetch: vi.fn(),
    seedDatabase: vi.fn(),
    updateBedOccupancy: vi.fn(),
    updateAmbulance: vi.fn(),
    simulateCapacityCrisis: vi.fn(),
  }),
}))

vi.mock('@/hooks/useAmbulanceSimulation', () => ({
  useAmbulanceSimulation: () => ({
    divertAmbulance: vi.fn(),
    acceptAmbulance: vi.fn(),
    pendingAmbulances: [],
  }),
}))

describe('HospitalsNetworkPage component', () => {
  it('renders hospital cards and facilities count', () => {
    render(<HospitalsNetworkPage />)

    expect(screen.getByText('Apex Hospital')).toBeInTheDocument()
    expect(screen.getByText('Fortis Escorts Hospital')).toBeInTheDocument()
  })

  it('filters hospital list when typing into search box', () => {
    render(<HospitalsNetworkPage />)

    // The input with placeholder 'Search hospital, specialty...' or translated string
    const searchInput = screen.getByRole('textbox')
    fireEvent.change(searchInput, { target: { value: 'Fortis' } })

    expect(screen.getByText('Fortis Escorts Hospital')).toBeInTheDocument()
    expect(screen.queryByText('Apex Hospital')).not.toBeInTheDocument()
  })
})
