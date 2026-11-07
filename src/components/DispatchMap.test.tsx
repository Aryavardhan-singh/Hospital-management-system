import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { DispatchMap } from './DispatchMap'
import { Hospital, Ambulance } from '@/types'

const mockHospitals: Hospital[] = [
  {
    id: 'hosp-1',
    name: 'City General Hospital',
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
    specialties: ['Emergency Care', 'Cardiology'],
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
  {
    id: 'AMB-102',
    lat: 26.92,
    lng: 75.795,
    status: 'occupied',
    assigned_hospital_id: 'hosp-1',
  },
]

describe('DispatchMap component', () => {
  it('renders leaflet map container and markers correctly', () => {
    render(<DispatchMap hospitals={mockHospitals} ambulances={mockAmbulances} />)

    expect(screen.getByTestId('leaflet-map-container')).toBeInTheDocument()
    // Markers rendered for hospital and ambulances
    const markers = screen.getAllByTestId('leaflet-marker')
    expect(markers.length).toBeGreaterThanOrEqual(2)
  })

  it('renders with selected ambulance without crashing', () => {
    const { container } = render(
      <DispatchMap
        hospitals={mockHospitals}
        ambulances={mockAmbulances}
        selectedAmbulanceId="AMB-101"
      />
    )
    expect(container).toBeInTheDocument()
  })
})
