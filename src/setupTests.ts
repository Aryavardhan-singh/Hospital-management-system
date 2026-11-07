import '@testing-library/jest-dom'
import React from 'react'
import '@/i18n' // Initialize i18next

// Mock virtual:pwa-register/react
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    offlineReady: [false, vi.fn()],
    needRefresh: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Mock HTMLCanvasElement.prototype.getContext for JSDOM
HTMLCanvasElement.prototype.getContext = (() => {
  return {
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: new Array(4) }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
}) as unknown as typeof HTMLCanvasElement.prototype.getContext

// Mock maplibre-gl with constructible classes
vi.mock('maplibre-gl', () => {
  class MockMap {
    on = vi.fn()
    once = vi.fn()
    off = vi.fn()
    remove = vi.fn()
    addControl = vi.fn()
    setWorkerUrl = vi.fn()
    flyTo = vi.fn()
    fitBounds = vi.fn()
    getSource = vi.fn()
    addSource = vi.fn()
    addLayer = vi.fn()
    removeLayer = vi.fn()
    removeSource = vi.fn()
    addImage = vi.fn()
    loadImage = vi.fn()
  }

  class MockNavigationControl {}

  class MockMarker {
    setLngLat = vi.fn().mockReturnThis()
    addTo = vi.fn().mockReturnThis()
    remove = vi.fn()
    setPopup = vi.fn().mockReturnThis()
  }

  class MockPopup {
    setHTML = vi.fn().mockReturnThis()
  }

  const setWorkerUrl = vi.fn()

  return {
    default: {
      Map: MockMap,
      NavigationControl: MockNavigationControl,
      Marker: MockMarker,
      Popup: MockPopup,
      setWorkerUrl,
    },
    Map: MockMap,
    NavigationControl: MockNavigationControl,
    Marker: MockMarker,
    Popup: MockPopup,
    setWorkerUrl,
  }
})

// Mock react-leaflet and leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'leaflet-map-container' }, children),
  TileLayer: () => React.createElement('div', { 'data-testid': 'leaflet-tile-layer' }),
  Marker: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'leaflet-marker' }, children),
  Popup: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'leaflet-popup' }, children),
  Polyline: () => React.createElement('div', { 'data-testid': 'leaflet-polyline' }),
  Circle: () => React.createElement('div', { 'data-testid': 'leaflet-circle' }),
  useMap: () => ({
    flyTo: vi.fn(),
    setView: vi.fn(),
    fitBounds: vi.fn(),
  }),
}))

vi.mock('leaflet', () => ({
  default: {
    icon: vi.fn(() => ({})),
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn(() => ({
      isValid: () => true,
      pad: vi.fn(),
    })),
  },
  icon: vi.fn(() => ({})),
  divIcon: vi.fn(() => ({})),
}))
