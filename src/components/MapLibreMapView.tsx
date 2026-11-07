import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { Maximize2, Minimize2 } from 'lucide-react'
import { Map, NavigationControl, Popup, setWorkerUrl } from 'maplibre-gl'
import { type GeoJSONSource } from 'maplibre-gl'
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FeatureCollection } from 'geojson'
import { createAmbulanceModelLayer, type AmbulanceModelLayer } from '@/lib/ambulanceModelLayer'

setWorkerUrl(mapLibreWorkerUrl)

const EMPTY_FEATURE_COLLECTION: FeatureCollection = { type: 'FeatureCollection', features: [] }

type MarkerKind = 'citizen' | 'hospital' | 'ambulance'
type MapMode = 'street' | 'satellite' | '3d'

export interface MapLibreMapMarker {
  id: string
  title: string
  detail?: string
  kind: MarkerKind
  lat: number
  lng: number
  color?: 'green' | 'amber' | 'red'
  status?: 'idle' | 'enroute' | 'occupied'
  rank?: number
  heading?: number
}

export interface MapLibreMapHandle {
  /** Fly the map camera to the ambulance marker. */
  flyToAmbulance: () => void
}

interface MapLibreMapViewProps {
  center: [number, number]
  markers: MapLibreMapMarker[]
  routeCoordinates?: [number, number][]
  className?: string
  fitMarkersOnLoad?: boolean
  initialZoom?: number
  /**
   * When true the 3D ambulance model is rendered in ALL map modes (street,
   * satellite, 3d), not only when the mode toggle is set to 3D.
   * Use this for the citizen live-tracking view.
   */
  alwaysShowModel?: boolean
}

function drawMarker(kind: MarkerKind, fill: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 48
  canvas.height = 48
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not draw the map marker.')

  context.beginPath()
  context.arc(24, 24, 21, 0, Math.PI * 2)
  context.fillStyle = fill
  context.fill()
  context.lineWidth = 3
  context.strokeStyle = '#ffffff'
  context.stroke()

  if (kind === 'hospital') {
    context.strokeStyle = '#ffffff'
    context.lineWidth = 4
    context.lineCap = 'round'
    context.beginPath()
    context.moveTo(24, 15)
    context.lineTo(24, 33)
    context.moveTo(15, 24)
    context.lineTo(33, 24)
    context.stroke()
  } else if (kind === 'ambulance') {
    context.fillStyle = '#ffffff'
    context.beginPath()
    context.roundRect(10, 18, 19, 13, 2)
    context.moveTo(29, 21)
    context.lineTo(35, 21)
    context.lineTo(39, 26)
    context.lineTo(39, 31)
    context.closePath()
    context.fill()
    context.fillStyle = fill
    context.beginPath()
    context.arc(18, 32, 3, 0, Math.PI * 2)
    context.arc(33, 32, 3, 0, Math.PI * 2)
    context.fill()
    context.strokeStyle = '#ffffff'
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(18, 21)
    context.lineTo(18, 28)
    context.moveTo(14.5, 24.5)
    context.lineTo(21.5, 24.5)
    context.stroke()
  } else {
    context.beginPath()
    context.arc(24, 24, 7, 0, Math.PI * 2)
    context.fillStyle = '#ffffff'
    context.fill()
  }

  return context.getImageData(0, 0, 48, 48)
}

function markerIcon(marker: MapLibreMapMarker) {
  if (marker.kind === 'citizen') return 'citizen-marker'
  if (marker.kind === 'ambulance') return `ambulance-${marker.status ?? 'idle'}`
  return `hospital-${marker.color ?? 'green'}`
}

function markerCollection(markers: MapLibreMapMarker[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: markers.map((marker) => ({
      type: 'Feature',
      properties: {
        id: marker.id,
        title: marker.title,
        detail: marker.detail ?? '',
        kind: marker.kind,
        icon: markerIcon(marker),
        rank: marker.rank ?? '',
      },
      geometry: { type: 'Point', coordinates: [marker.lng, marker.lat] },
    })),
  }
}

export const MapLibreMapView = forwardRef<MapLibreMapHandle, MapLibreMapViewProps>(
  function MapLibreMapView(
    {
      center,
      markers,
      routeCoordinates = [],
      className = '',
      fitMarkersOnLoad = false,
      initialZoom = 12,
      alwaysShowModel = false,
    },
    ref
  ) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const ambulanceModelRef = useRef<AmbulanceModelLayer | null>(null)
  const initialViewRef = useRef({ center, initialZoom })
  const modeRef = useRef<MapMode>('street')
  const fittedRef = useRef(false)
  const [mapReady, setMapReady] = useState(false)
  const [mode, setMode] = useState<MapMode>('street')
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Dynamic style switch on theme change

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return
    if (mode === 'street') {
      map.setStyle(isDark ? 'https://tiles.openfreemap.org/styles/dark' : 'https://tiles.openfreemap.org/styles/liberty')
    }
  }, [isDark, mapReady, mode])

  const points = useMemo(() => markerCollection(markers), [markers])
  const route = useMemo<FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: routeCoordinates.length > 1
      ? [{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates.map(([latitude, longitude]) => [longitude, latitude]),
          },
        }]
      : [],
  }), [routeCoordinates])

  // Expose flyToAmbulance() to parent components via ref
  useImperativeHandle(ref, () => ({
    flyToAmbulance() {
      const map = mapRef.current
      if (!map) return
      const ambulance = markers.find((m) => m.kind === 'ambulance')
      if (!ambulance) return
      map.flyTo({
        center: [ambulance.lng, ambulance.lat],
        zoom: 15,
        speed: 1.4,
        curve: 1.4,
        duration: 1200,
      })
    },
  }), [markers])

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(document.fullscreenElement === frameRef.current)
    document.addEventListener('fullscreenchange', updateFullscreen)
    return () => document.removeEventListener('fullscreenchange', updateFullscreen)
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    let disposed = false
    const [latitude, longitude] = initialViewRef.current.center
    const map = new Map({
      container: containerRef.current,
      style: isDark ? 'https://tiles.openfreemap.org/styles/dark' : 'https://tiles.openfreemap.org/styles/liberty',
      center: [longitude, latitude],
      zoom: initialViewRef.current.initialZoom,
    })
    mapRef.current = map
    map.addControl(new NavigationControl(), 'top-right')

    map.once('load', () => {
      if (disposed) return
      map.addImage('citizen-marker', drawMarker('citizen', '#4f46e5'), { pixelRatio: 2 })
      map.addImage('hospital-green', drawMarker('hospital', '#0f766e'), { pixelRatio: 2 })
      map.addImage('hospital-amber', drawMarker('hospital', '#d97706'), { pixelRatio: 2 })
      map.addImage('hospital-red', drawMarker('hospital', '#e11d48'), { pixelRatio: 2 })
      map.addImage('ambulance-idle', drawMarker('ambulance', '#475569'), { pixelRatio: 2 })
      map.addImage('ambulance-enroute', drawMarker('ambulance', '#2563eb'), { pixelRatio: 2 })
      map.addImage('ambulance-occupied', drawMarker('ambulance', '#ea580c'), { pixelRatio: 2 })

      const beforeLabels = map.getStyle().layers.find((layer) => layer.type === 'symbol')?.id
      map.addSource('citizen-satellite', {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 19,
        attribution: 'Tiles © Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      })
      map.addLayer({
        id: 'citizen-satellite-layer',
        type: 'raster',
        source: 'citizen-satellite',
        layout: { visibility: modeRef.current === 'street' ? 'none' : 'visible' },
      }, beforeLabels)

      map.addSource('citizen-terrain', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 15,
        encoding: 'terrarium',
        attribution: 'Elevation data © AWS Terrain Tiles',
      })

      const styleLayers = map.getStyle().layers
      const vectorSource = Object.entries(map.getStyle().sources).find(([, source]) => source.type === 'vector')?.[0]
      const buildingLayer = styleLayers.find(
        (layer) => (layer as { 'source-layer'?: string })['source-layer'] === 'building'
      ) as ({ 'source-layer'?: string } | undefined)
      const buildingSourceLayer = buildingLayer?.['source-layer']
      if (vectorSource && buildingSourceLayer) {
        map.addLayer({
          id: 'citizen-buildings-3d',
          type: 'fill-extrusion',
          source: vectorSource,
          'source-layer': buildingSourceLayer,
          minzoom: 14,
          filter: ['any', ['has', 'render_height'], ['has', 'height']],
          paint: {
            'fill-extrusion-color': '#94a3b8',
            'fill-extrusion-height': ['coalesce', ['to-number', ['get', 'render_height']], ['to-number', ['get', 'height']], 8],
            'fill-extrusion-base': ['coalesce', ['to-number', ['get', 'render_min_height']], ['to-number', ['get', 'min_height']], 0],
            'fill-extrusion-opacity': 0.78,
          },
          layout: { visibility: modeRef.current === '3d' ? 'visible' : 'none' },
        }, beforeLabels)
      }

      map.addSource('citizen-points', { type: 'geojson', data: EMPTY_FEATURE_COLLECTION })
      map.addLayer({
        id: 'citizen-point-icons',
        type: 'symbol',
        source: 'citizen-points',
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': 0.78,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      })
      map.addLayer({
        id: 'citizen-point-ranks',
        type: 'symbol',
        source: 'citizen-points',
        filter: ['all', ['==', ['get', 'kind'], 'hospital'], ['!=', ['get', 'rank'], '']],
        layout: {
          'text-field': ['get', 'rank'],
          'text-size': 11,
          'text-font': ['Open Sans Bold'],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: { 'text-color': '#ffffff' },
      })
      map.addSource('citizen-route', { type: 'geojson', data: EMPTY_FEATURE_COLLECTION })
      map.addLayer({
        id: 'citizen-route-line',
        type: 'line',
        source: 'citizen-route',
        paint: { 'line-color': '#0f766e', 'line-width': 5, 'line-opacity': 0.9 },
      })

      map.on('click', 'citizen-point-icons', (event) => {
        const properties = event.features?.[0]?.properties
        if (!properties) return
        const content = document.createElement('div')
        content.className = 'space-y-1'
        const title = document.createElement('strong')
        title.textContent = String(properties.title)
        content.append(title)
        if (properties.detail) {
          const detail = document.createElement('p')
          detail.textContent = String(properties.detail)
          content.append(detail)
        }
        new Popup({ closeButton: true, maxWidth: '260px' })
          .setLngLat(event.lngLat)
          .setDOMContent(content)
          .addTo(map)
      })
      map.on('mouseenter', 'citizen-point-icons', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'citizen-point-icons', () => { map.getCanvas().style.cursor = '' })

      setMapReady(true)
    })

    return () => {
      disposed = true
      map.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [])

  useEffect(() => {
    modeRef.current = mode
    const map = mapRef.current
    if (!mapReady || !map) return

    map.setLayoutProperty('citizen-satellite-layer', 'visibility', mode === 'street' ? 'none' : 'visible')
    if (map.getLayer('citizen-buildings-3d')) {
      map.setLayoutProperty('citizen-buildings-3d', 'visibility', mode === '3d' ? 'visible' : 'none')
    }
    map.setTerrain(mode === '3d' ? { source: 'citizen-terrain', exaggeration: 1.15 } : null)
    map.easeTo({
      pitch: mode === '3d' ? 56 : 0,
      bearing: mode === '3d' ? -16 : 0,
      duration: 500,
    })
  }, [mapReady, mode])

  useEffect(() => {
    if (!mapReady) return
    const source = mapRef.current?.getSource('citizen-points') as GeoJSONSource | undefined
    source?.setData(points)
  }, [mapReady, points])

  useEffect(() => {
    if (!mapReady) return
    const source = mapRef.current?.getSource('citizen-route') as GeoJSONSource | undefined
    source?.setData(route)
  }, [mapReady, route])

  // 3D ambulance model: show in '3d' mode always; also in all modes when alwaysShowModel=true
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    const ambulance = markers.find((marker) => marker.kind === 'ambulance')
    const shouldShowModel = ambulance && (alwaysShowModel || mode === '3d')

    if (!shouldShowModel) {
      if (ambulanceModelRef.current) {
        if (map.getLayer(ambulanceModelRef.current.id)) map.removeLayer(ambulanceModelRef.current.id)
        ambulanceModelRef.current = null
      }
      // Restore the flat ambulance icon when model is hidden
      map.setFilter('citizen-point-icons', null)
      return
    }

    if (!ambulanceModelRef.current) {
      ambulanceModelRef.current = createAmbulanceModelLayer()
      map.addLayer(ambulanceModelRef.current)
    }
    ambulanceModelRef.current.updatePosition({
      longitude: ambulance.lng,
      latitude: ambulance.lat,
      heading: ambulance.heading ?? 0,
    })
    ambulanceModelRef.current.setVisible(true)

    // Hide the flat ambulance icon so they don't stack
    map.setFilter('citizen-point-icons', ['!=', ['get', 'kind'], 'ambulance'])
  }, [mapReady, markers, mode, alwaysShowModel])

  useEffect(() => {
    if (!mapReady || !fitMarkersOnLoad || fittedRef.current || markers.length < 2) return
    const longitudes = markers.map((marker) => marker.lng)
    const latitudes = markers.map((marker) => marker.lat)
    mapRef.current?.fitBounds(
      [[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]],
      { padding: 48, maxZoom: 15, duration: 500 }
    )
    fittedRef.current = true
  }, [mapReady, fitMarkersOnLoad, markers])

  const toggleFullscreen = async () => {
    if (!frameRef.current) return
    if (document.fullscreenElement === frameRef.current) await document.exitFullscreen()
    else await frameRef.current.requestFullscreen()
  }

  const buttonStyle = (selected: boolean, separated: boolean) => ({
    padding: '7px 10px',
    border: 0,
    borderLeft: separated ? '1px solid #d1d5db' : 0,
    background: selected ? '#0f172a' : '#ffffff',
    color: selected ? '#ffffff' : '#334155',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  })

  return (
    <div
      ref={frameRef}
      className={`relative h-full min-h-[320px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 ${isFullscreen ? 'h-screen w-screen rounded-none' : ''} ${className}`}
    >
      <div ref={containerRef} className="h-full w-full" />
      <div role="group" aria-label="Map controls" className="absolute left-3 top-3 z-10 flex overflow-hidden rounded-lg border border-slate-300 bg-white shadow-md">
        <button type="button" aria-pressed={mode === 'street'} style={buttonStyle(mode === 'street', false)} onClick={() => setMode('street')}>Street</button>
        <button type="button" aria-pressed={mode === 'satellite'} style={buttonStyle(mode === 'satellite', true)} onClick={() => setMode('satellite')}>Satellite</button>
        <button type="button" aria-pressed={mode === '3d'} style={buttonStyle(mode === '3d', true)} onClick={() => setMode('3d')}>3D</button>
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          aria-label={isFullscreen ? 'Exit full screen map' : 'Open full screen map'}
          title={isFullscreen ? 'Exit full screen' : 'Full screen map'}
          style={{ ...buttonStyle(isFullscreen, true), width: 36, padding: 8 }}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
})
