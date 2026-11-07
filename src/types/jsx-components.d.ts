interface EmergencyMapProps {
  hospitals: import('./index').Hospital[]
  ambulances: import('./index').Ambulance[]
  updateAmbulance: (id: string, patch: Partial<import('./index').Ambulance>) => Promise<void>
  isConfigured: boolean
  isLive: boolean
  isUsingMockData: boolean
  selectedAmbulanceId?: string | null
  trafficZones?: import('../lib/routing').CongestionZone[]
  incidentHotspots?: import('../components/DispatchMap').IncidentHotspot[]
  onSelectAmbulance?: (id: string | null) => void
  onDispatchToHospital?: (ambulanceId: string, hospitalId: string) => void | Promise<void>
  onRefreshAvailability?: () => Promise<void>
  dispatchingAmbulanceId?: string | null
}

declare module '*.jsx' {
  import type { ComponentType } from 'react'

  const Component: ComponentType<EmergencyMapProps>
  export default Component
}
