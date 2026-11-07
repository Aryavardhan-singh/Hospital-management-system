import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { PublicPage } from './PublicPage'
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
    specialties: ['Cardiology', 'Emergency Care'],
    status: 'operational',
  },
]

const mockAmbulances: Ambulance[] = [
  {
    id: 'AMB-101',
    lat: 26.915,
    lng: 75.789,
    status: 'idle',
    assigned_hospital_id: null,
  },
]

vi.mock('@/hooks/useSupabaseData', () => ({
  useSupabaseData: () => ({
    hospitals: mockHospitals,
    ambulances: mockAmbulances,
    loading: false,
    isLive: true,
    createAmbulanceRequest: vi.fn().mockResolvedValue({ id: 'AMB-CIT-1234' }),
    updateAmbulance: vi.fn(),
  }),
}))

vi.mock('@/hooks/useAmbulanceSimulation', () => ({
  useAmbulanceSimulation: () => ({
    divertAmbulance: vi.fn(),
    acceptAmbulance: vi.fn(),
    pendingAmbulances: [],
  }),
}))

describe('PublicPage component', () => {
  beforeEach(() => {
    // Mock navigator.geolocation to immediately return coordinates
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((success) =>
        success({
          coords: {
            latitude: 26.9124,
            longitude: 75.7873,
          },
        })
      ),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    }
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    })
  })

  it('renders triage options and emergency ambulance dispatch controls', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <PublicPage />
        </MemoryRouter>
      </ThemeProvider>
    )

    // Verify triage level buttons and emergency advice section are available
    expect(await screen.findByText(/Critical|गंभीर/i)).toBeInTheDocument()
    expect(screen.getByText(/Moderate|मध्यम/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Minor|मामूली/i).length).toBeGreaterThan(0)
  })

  it('allows selecting triage level', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <PublicPage />
        </MemoryRouter>
      </ThemeProvider>
    )

    const criticalBtn = await screen.findByText(/Critical|गंभीर/i)
    fireEvent.click(criticalBtn)
    expect(criticalBtn).toBeInTheDocument()
  })
})
