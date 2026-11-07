import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { Map, NavigationControl, setWorkerUrl } from "maplibre-gl";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import { Building2, Maximize2, Minimize2, RefreshCw, Truck, X } from "lucide-react";
import { getRoadRoute } from "../lib/osrm";
import { fetchNearbyFacilities } from "../lib/overpass";

setWorkerUrl(mapLibreWorkerUrl);

const JAIPUR_CENTER = { latitude: 26.9124, longitude: 75.7873 };
const EMPTY_FEATURE_COLLECTION = { type: "FeatureCollection", features: [] };

function toPointCollection(items) {
  return {
    type: "FeatureCollection",
    features: items.map((item) => ({
      type: "Feature",
      properties: item.properties,
      geometry: { type: "Point", coordinates: [item.longitude, item.latitude] },
    })),
  };
}

function createMapMarkerIcon(kind, fill) {
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 48;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create map marker icon.");

  context.beginPath();
  context.arc(24, 24, 21, 0, Math.PI * 2);
  context.fillStyle = fill;
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = "#ffffff";
  context.stroke();

  if (kind === "hospital") {
    context.strokeStyle = "#ffffff";
    context.lineWidth = 4;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(24, 15);
    context.lineTo(24, 33);
    context.moveTo(15, 24);
    context.lineTo(33, 24);
    context.stroke();
  } else {
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.roundRect(10, 18, 19, 13, 2);
    context.moveTo(29, 21);
    context.lineTo(35, 21);
    context.lineTo(39, 26);
    context.lineTo(39, 31);
    context.lineTo(29, 31);
    context.closePath();
    context.fill();
    context.fillStyle = fill;
    context.beginPath();
    context.arc(18, 32, 3, 0, Math.PI * 2);
    context.arc(33, 32, 3, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#ffffff";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(18, 21);
    context.lineTo(18, 28);
    context.moveTo(14.5, 24.5);
    context.lineTo(21.5, 24.5);
    context.stroke();
  }

  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function distanceMetres(first, second) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(first.latitude)) *
      Math.cos(radians(second.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function circleFeatureCollection(items, radiusForItem, color) {
  return {
    type: "FeatureCollection",
    features: items.map((item) => {
      const radius = radiusForItem(item);
      const coordinates = Array.from({ length: 65 }, (_, index) => {
        const angle = (index / 64) * 2 * Math.PI;
        const latitudeOffset = (radius / 111_320) * Math.cos(angle);
        const longitudeOffset =
          (radius / (111_320 * Math.cos((item.lat * Math.PI) / 180))) * Math.sin(angle);
        return [item.lng + longitudeOffset, item.lat + latitudeOffset];
      });
      return {
        type: "Feature",
        properties: { id: item.id, name: item.name ?? item.id, color },
        geometry: { type: "Polygon", coordinates: [coordinates] },
      };
    }),
  };
}

export default function EmergencyMap({
  hospitals,
  ambulances,
  updateAmbulance,
  isConfigured,
  isLive,
  isUsingMockData,
  selectedAmbulanceId,
  trafficZones = [],
  incidentHotspots = [],
  onSelectAmbulance,
  onDispatchToHospital,
  onRefreshAvailability,
  dispatchingAmbulanceId,
}) {
  const mapFrameRef = useRef(null);
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const trackingWatchRef = useRef(null);
  const lastGpsWriteRef = useRef(null);
  const locationTimerRef = useRef(null);
  const modeRef = useRef("street");
  const [mapReady, setMapReady] = useState(false);
  const [mode, setMode] = useState("street");
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("requesting");
  const [locationError, setLocationError] = useState("");
  const [osmFacilities, setOsmFacilities] = useState([]);
  const [facilityStatus, setFacilityStatus] = useState("loading");
  const [facilityError, setFacilityError] = useState("");
  const [refreshSequence, setRefreshSequence] = useState(0);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [route, setRoute] = useState(null);
  const [trackingAmbulanceId, setTrackingAmbulanceId] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [facilityPanelOpen, setFacilityPanelOpen] = useState(false);
  const [gpsPanelOpen, setGpsPanelOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dispatchTargetAmbulanceId, setDispatchTargetAmbulanceId] = useState("");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const updateFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === mapFrameRef.current);
    };
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

  const facilities = useMemo(
    () => [
      ...hospitals.map((hospital) => ({
        id: `network:${hospital.id}`,
        name: hospital.name,
        category: "network hospital",
        latitude: hospital.lat,
        longitude: hospital.lng,
        source: "network",
        icon: hospital.occupied_beds / Math.max(1, hospital.total_beds) >= 0.9
          ? "hospital-critical"
          : hospital.occupied_beds / Math.max(1, hospital.total_beds) >= 0.7
            ? "hospital-busy"
            : "hospital-available",
      })),
      ...osmFacilities.map((facility) => ({
        ...facility,
        source: "osm",
        icon: facility.category === "ambulance_station" ? "ambulance-idle" : "facility-marker",
      })),
    ],
    [hospitals, osmFacilities]
  );

  const searchLatitude = userLocation?.latitude ?? JAIPUR_CENTER.latitude;
  const searchLongitude = userLocation?.longitude ?? JAIPUR_CENTER.longitude;

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      setLocationError("This browser does not support location access.");
      return;
    }

    if (locationTimerRef.current !== null) window.clearTimeout(locationTimerRef.current);
    setLocationStatus("requesting");
    setLocationError("");
    locationTimerRef.current = window.setTimeout(() => {
      setLocationStatus((status) => status === "requesting" ? "denied" : status);
      setLocationError("GPS permission is taking too long. Allow location access or use the Jaipur center reference.");
    }, 15_000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (locationTimerRef.current !== null) window.clearTimeout(locationTimerRef.current);
        locationTimerRef.current = null;
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
        });
        setLocationStatus("ready");
        setFacilityStatus("loading");
        setLocationError("");
        mapRef.current?.easeTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 14,
          duration: 700,
        });
      },
      (error) => {
        if (locationTimerRef.current !== null) window.clearTimeout(locationTimerRef.current);
        locationTimerRef.current = null;
        setLocationStatus("denied");
        setLocationError(error.message || "Location permission was denied.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 }
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchNearbyFacilities(searchLatitude, searchLongitude, 12_000, controller.signal)
      .then((result) => {
        setOsmFacilities(result);
        setFacilityStatus("ready");
        setFacilityError("");
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setFacilityStatus("error");
        setFacilityError(`${error.message || "OpenStreetMap facility search is unavailable."} Supabase network hospitals are still shown.`);
      });

    return () => controller.abort();
  }, [searchLatitude, searchLongitude, refreshSequence]);

  useEffect(() => {
    let disposed = false;
    const map = new Map({
      container: mapContainer.current,
      style: isDark ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/liberty",
      center: [JAIPUR_CENTER.longitude, JAIPUR_CENTER.latitude],
      zoom: 12,
    });

    mapRef.current = map;
    map.addControl(new NavigationControl(), "top-right");

    map.once("load", () => {
      if (disposed) return;
      requestLocation();

      map.addImage("hospital-available", createMapMarkerIcon("hospital", "#0f766e"), { pixelRatio: 2 });
      map.addImage("hospital-busy", createMapMarkerIcon("hospital", "#d97706"), { pixelRatio: 2 });
      map.addImage("hospital-critical", createMapMarkerIcon("hospital", "#e11d48"), { pixelRatio: 2 });
      map.addImage("facility-marker", createMapMarkerIcon("hospital", "#ea580c"), { pixelRatio: 2 });
      map.addImage("ambulance-idle", createMapMarkerIcon("ambulance", "#475569"), { pixelRatio: 2 });
      map.addImage("ambulance-enroute", createMapMarkerIcon("ambulance", "#2563eb"), { pixelRatio: 2 });
      map.addImage("ambulance-occupied", createMapMarkerIcon("ambulance", "#ea580c"), { pixelRatio: 2 });

      map.addSource("esri-satellite", {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Tiles © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
      });
      map.addLayer({
        id: "esri-satellite-layer",
        type: "raster",
        source: "esri-satellite",
        paint: { "raster-opacity": 1 },
        layout: { visibility: modeRef.current === "satellite" ? "visible" : "none" },
      }, map.getStyle().layers.find((layer) => layer.type === "symbol")?.id);

      map.addSource("terrain-dem", {
        type: "raster-dem",
        tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 15,
        encoding: "terrarium",
        attribution: "Elevation data © AWS Terrain Tiles",
      });

      const styleLayers = map.getStyle().layers;
      const firstSymbolLayer = styleLayers.find((layer) => layer.type === "symbol")?.id;
      const vectorSource = Object.entries(map.getStyle().sources).find(
        ([, source]) => source.type === "vector"
      )?.[0];
      const buildingSourceLayer = styleLayers.find(
        (layer) => layer["source-layer"] === "building"
      )?.["source-layer"];
      if (vectorSource && buildingSourceLayer) {
        map.addLayer({
          id: "fleet-buildings-3d",
          type: "fill-extrusion",
          source: vectorSource,
          "source-layer": buildingSourceLayer,
          minzoom: 14,
          filter: ["any", ["has", "render_height"], ["has", "height"]],
          paint: {
            "fill-extrusion-color": "#94a3b8",
            "fill-extrusion-height": [
              "coalesce",
              ["to-number", ["get", "render_height"]],
              ["to-number", ["get", "height"]],
              8,
            ],
            "fill-extrusion-base": [
              "coalesce",
              ["to-number", ["get", "render_min_height"]],
              ["to-number", ["get", "min_height"]],
              0,
            ],
            "fill-extrusion-opacity": 0.78,
          },
          layout: { visibility: modeRef.current === "3d" ? "visible" : "none" },
        }, firstSymbolLayer);
      }

      map.addSource("selected-route", {
        type: "geojson",
        data: EMPTY_FEATURE_COLLECTION,
      });
      map.addLayer({
        id: "selected-route-line",
        type: "line",
        source: "selected-route",
        paint: { "line-color": "#0f766e", "line-width": 4, "line-opacity": 0.9 },
      });

      map.addSource("traffic-zones", {
        type: "geojson",
        data: EMPTY_FEATURE_COLLECTION,
      });
      map.addLayer({
        id: "traffic-zone-fill",
        type: "fill",
        source: "traffic-zones",
        paint: { "fill-color": "#f59e0b", "fill-opacity": 0.2 },
      });
      map.addLayer({
        id: "traffic-zone-outline",
        type: "line",
        source: "traffic-zones",
        paint: { "line-color": "#d97706", "line-width": 2, "line-dasharray": [2, 2] },
      });

      map.addSource("incident-hotspots", {
        type: "geojson",
        data: EMPTY_FEATURE_COLLECTION,
      });
      map.addLayer({
        id: "incident-hotspot-fill",
        type: "fill",
        source: "incident-hotspots",
        paint: { "fill-color": "#f43f5e", "fill-opacity": 0.2 },
      });
      map.addLayer({
        id: "incident-hotspot-outline",
        type: "line",
        source: "incident-hotspots",
        paint: { "line-color": "#e11d48", "line-width": 2, "line-dasharray": [2, 2] },
      });

      map.addSource("facility-points", {
        type: "geojson",
        data: EMPTY_FEATURE_COLLECTION,
      });
      map.addLayer({
        id: "facility-markers",
        type: "symbol",
        source: "facility-points",
        layout: {
          "icon-image": ["get", "icon"],
          "icon-size": 0.72,
          "icon-allow-overlap": false,
          "icon-ignore-placement": false,
          "icon-padding": 2,
          "text-field": ["get", "name"],
          "text-size": 10,
          "text-offset": [0, 1.6],
          "text-anchor": "top",
          "text-allow-overlap": false,
          "text-ignore-placement": false,
          "text-max-width": 8,
        },
      });

      map.addSource("ambulance-points", {
        type: "geojson",
        data: EMPTY_FEATURE_COLLECTION,
      });
      map.addLayer({
        id: "ambulance-markers",
        type: "symbol",
        source: "ambulance-points",
        layout: {
          "icon-image": ["get", "icon"],
          "icon-size": 0.78,
          "icon-allow-overlap": false,
          "icon-ignore-placement": false,
          "icon-offset": [0, -6],
          "icon-padding": 2,
          "text-field": ["get", "status"],
          "text-size": 10,
          "text-offset": [0, 1.6],
          "text-anchor": "top",
          "text-allow-overlap": false,
          "text-ignore-placement": false,
        },
      });

      map.addSource("user-location", {
        type: "geojson",
        data: EMPTY_FEATURE_COLLECTION,
      });
      map.addSource("user-accuracy", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "user-accuracy-circle",
        type: "fill",
        source: "user-accuracy",
        paint: {
          "fill-color": "#0f766e",
          "fill-opacity": 0.12,
        },
      });
      map.addLayer({
        id: "user-accuracy-outline",
        type: "line",
        source: "user-accuracy",
        paint: {
          "line-color": "#0f766e",
          "line-width": 1.5,
          "line-opacity": 0.6,
        },
      });
      map.addLayer({
        id: "user-location-marker",
        type: "circle",
        source: "user-location",
        paint: {
          "circle-radius": 9,
          "circle-color": "#0f766e",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
        },
      });

      map.on("click", "facility-markers", (event) => {
        const properties = event.features?.[0]?.properties;
        if (!properties) return;
        onSelectAmbulance?.(null);
        setSelectedFacility({
          id: String(properties.id),
          name: String(properties.name),
          category: String(properties.category),
          source: String(properties.source),
          latitude: event.lngLat.lat,
          longitude: event.lngLat.lng,
        });
      });
      map.on("click", "ambulance-markers", (event) => {
        const ambulanceId = event.features?.[0]?.properties?.id;
        if (ambulanceId) {
          const id = String(ambulanceId);
          setSelectedFacility(null);
          setTrackingAmbulanceId(id);
          onSelectAmbulance?.(id);
        }
      });
      map.on("mouseenter", "facility-markers", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "facility-markers", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "ambulance-markers", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "ambulance-markers", () => {
        map.getCanvas().style.cursor = "";
      });

      setMapReady(true);
    });

    return () => {
      disposed = true;
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [requestLocation, onSelectAmbulance]);

  useEffect(() => {
    modeRef.current = mode;
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const isSatelliteMode = mode === "satellite" || mode === "3d";
    map.setLayoutProperty(
      "esri-satellite-layer",
      "visibility",
      isSatelliteMode ? "visible" : "none"
    );
    if (map.getLayer("fleet-buildings-3d")) {
      map.setLayoutProperty("fleet-buildings-3d", "visibility", mode === "3d" ? "visible" : "none");
    }
    map.setTerrain(mode === "3d" ? { source: "terrain-dem", exaggeration: 1.15 } : null);
    map.easeTo({
      pitch: mode === "3d" ? 58 : 0,
      bearing: mode === "3d" ? -18 : 0,
      zoom: mode === "3d" ? 15 : 12.5,
      duration: 650,
    });
  }, [mode, mapReady]);


  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const targetStyle = isDark
      ? "https://tiles.openfreemap.org/styles/dark"
      : "https://tiles.openfreemap.org/styles/liberty";
    
    // Only switch style if in street mode
    if (mode === "street") {
      map.setStyle(targetStyle);
    }
  }, [isDark, mapReady, mode]);

  const facilityGeoJSON = useMemo(
    () =>
      toPointCollection(
        facilities.map((facility) => ({
          latitude: facility.latitude,
          longitude: facility.longitude,
          properties: {
            id: facility.id,
            name: facility.name,
            category: facility.category,
            source: facility.source,
            icon: facility.icon,
          },
        }))
      ),
    [facilities]
  );

  useEffect(() => {
    if (!mapReady) return;
    mapRef.current?.getSource("facility-points")?.setData(facilityGeoJSON);
  }, [facilityGeoJSON, mapReady]);

  const ambulanceGeoJSON = useMemo(
    () =>
      toPointCollection(
        ambulances.map((ambulance) => ({
          latitude: ambulance.lat,
          longitude: ambulance.lng,
          properties: {
            id: ambulance.id,
            status: ambulance.status,
            icon: `ambulance-${ambulance.status}`,
          },
        }))
      ),
    [ambulances]
  );

  const trafficGeoJSON = useMemo(
    () => circleFeatureCollection(trafficZones, (zone) => zone.radiusKm * 1000),
    [trafficZones]
  );

  const incidentGeoJSON = useMemo(
    () => circleFeatureCollection(incidentHotspots, (hotspot) => hotspot.radiusMeters),
    [incidentHotspots]
  );

  useEffect(() => {
    if (!mapReady) return;
    mapRef.current?.getSource("ambulance-points")?.setData(ambulanceGeoJSON);
  }, [ambulanceGeoJSON, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    mapRef.current?.getSource("traffic-zones")?.setData(trafficGeoJSON);
  }, [mapReady, trafficGeoJSON]);

  useEffect(() => {
    if (!mapReady) return;
    mapRef.current?.getSource("incident-hotspots")?.setData(incidentGeoJSON);
  }, [mapReady, incidentGeoJSON]);

  const selectedAmbulance = useMemo(
    () => ambulances.find((ambulance) => ambulance.id === selectedAmbulanceId),
    [ambulances, selectedAmbulanceId]
  );
  const idleAmbulances = useMemo(
    () => ambulances.filter((ambulance) => ambulance.status === "idle"),
    [ambulances]
  );
  const dispatchTargetId =
    idleAmbulances.find((ambulance) => ambulance.id === dispatchTargetAmbulanceId)?.id ??
    idleAmbulances.find((ambulance) => ambulance.id === selectedAmbulanceId)?.id ??
    idleAmbulances[0]?.id ??
    "";
  const selectedNetworkHospital = selectedFacility?.source === "network"
    ? hospitals.find((hospital) => `network:${hospital.id}` === selectedFacility.id) ?? null
    : null;

  useEffect(() => {
    if (!mapReady || !selectedAmbulance) return;
    mapRef.current?.flyTo({
      center: [selectedAmbulance.lng, selectedAmbulance.lat],
      zoom: mode === "3d" ? 16 : 14,
      pitch: mode === "3d" ? 58 : 0,
      duration: 700,
    });
  }, [mapReady, selectedAmbulance, mode]);

  const userLocationGeoJSON = useMemo(
    () =>
      userLocation
        ? toPointCollection([
            {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              properties: { name: "Your location" },
            },
          ])
        : EMPTY_FEATURE_COLLECTION,
    [userLocation]
  );

  useEffect(() => {
    if (!mapReady) return;
    mapRef.current?.getSource("user-location")?.setData(userLocationGeoJSON);

    // Update accuracy circle
    if (userLocation?.accuracy && userLocation.accuracy > 0) {
      const r = userLocation.accuracy;
      const lat = userLocation.latitude;
      const lng = userLocation.longitude;
      const steps = 64;
      const coords = Array.from({ length: steps + 1 }, (_, i) => {
        const angle = (i / steps) * 2 * Math.PI;
        const dLat = (r / 111320) * Math.cos(angle);
        const dLng = (r / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
        return [lng + dLng, lat + dLat];
      });
      mapRef.current?.getSource("user-accuracy")?.setData({
        type: "FeatureCollection",
        features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } }],
      });
    } else {
      mapRef.current?.getSource("user-accuracy")?.setData({ type: "FeatureCollection", features: [] });
    }
  }, [userLocation, userLocationGeoJSON, mapReady]);

  const activeRoute = route?.facilityId === selectedFacility?.id ? route : null;
  const routeOrigin = userLocation ?? (locationStatus === "fallback" ? JAIPUR_CENTER : null);
  const originLatitude = routeOrigin?.latitude;
  const originLongitude = routeOrigin?.longitude;
  const destinationId = selectedFacility?.id;
  const destinationLatitude = selectedFacility?.latitude;
  const destinationLongitude = selectedFacility?.longitude;

  useEffect(() => {
    if (
      originLatitude == null ||
      originLongitude == null ||
      destinationId == null ||
      destinationLatitude == null ||
      destinationLongitude == null
    ) return undefined;

    let cancelled = false;
    getRoadRoute(
      [originLatitude, originLongitude],
      [destinationLatitude, destinationLongitude]
    ).then((result) => {
      if (!cancelled) setRoute({ facilityId: destinationId, result });
    });

    return () => {
      cancelled = true;
    };
  }, [originLatitude, originLongitude, destinationId, destinationLatitude, destinationLongitude]);

  const routeGeoJSON = useMemo(() => {
    const coordinates = activeRoute?.result.geometryCoordinates;
    if (!coordinates?.length) return EMPTY_FEATURE_COLLECTION;

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: coordinates.map(([latitude, longitude]) => [longitude, latitude]),
          },
        },
      ],
    };
  }, [activeRoute]);

  useEffect(() => {
    if (!mapReady) return;
    mapRef.current?.getSource("selected-route")?.setData(routeGeoJSON);
  }, [mapReady, routeGeoJSON]);

  const refreshFacilities = () => {
    setFacilityStatus("loading");
    setFacilityError("");
    setRefreshSequence((previous) => previous + 1);
  };

  const toggleFullscreen = async () => {
    if (!mapFrameRef.current) return;
    if (document.fullscreenElement === mapFrameRef.current) {
      await document.exitFullscreen();
      return;
    }
    await mapFrameRef.current.requestFullscreen();
  };

  const trackingId = trackingAmbulanceId || ambulances[0]?.id || "";
  const canWriteGps = isConfigured && isLive && !isUsingMockData;

  const stopGpsSharing = useCallback(() => {
    if (trackingWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(trackingWatchRef.current);
    }
    trackingWatchRef.current = null;
    setIsTracking(false);
  }, []);

  const startGpsSharing = () => {
    if (!canWriteGps) {
      setTrackingError("Live ambulance GPS requires a connected Supabase project with persisted ambulance records.");
      return;
    }
    if (!trackingId) {
      setTrackingError("No ambulance is available to track.");
      return;
    }
    if (!navigator.geolocation) {
      setTrackingError("This browser does not support location sharing.");
      return;
    }

    setTrackingError("");
    lastGpsWriteRef.current = null;
    trackingWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const nextPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        const now = Date.now();
        const previous = lastGpsWriteRef.current;
        if (
          previous &&
          now - previous.updatedAt < 15_000 &&
          distanceMetres(previous, nextPosition) < 25
        ) {
          return;
        }

        lastGpsWriteRef.current = { ...nextPosition, updatedAt: now };
        void updateAmbulance(trackingId, {
          lat: nextPosition.latitude,
          lng: nextPosition.longitude,
        }).catch((error) => {
          setTrackingError(error.message || "Ambulance GPS could not be saved.");
          stopGpsSharing();
        });
      },
      (error) => {
        setTrackingError(error.message || "Could not read the driver's location.");
        stopGpsSharing();
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 }
    );
    setIsTracking(true);
  };

  useEffect(
    () => () => {
      if (locationTimerRef.current !== null) window.clearTimeout(locationTimerRef.current);
      if (trackingWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(trackingWatchRef.current);
      }
    },
    []
  );

  const selectFacility = (facility) => {
    setSelectedFacility(facility);
    mapRef.current?.easeTo({
      center: [facility.longitude, facility.latitude],
      zoom: 14,
      duration: 500,
    });
  };

  const useJaipurCenter = () => {
    setUserLocation(null);
    setLocationStatus("fallback");
    setLocationError("Using Jaipur city center as a reference, not your device GPS.");
    mapRef.current?.easeTo({
      center: [JAIPUR_CENTER.longitude, JAIPUR_CENTER.latitude],
      zoom: 12,
      duration: 700,
    });
  };

  const modeButtonStyle = (selected, separated = false) => ({
    padding: "8px 11px",
    border: 0,
    borderLeft: separated ? "1px solid #d1d5db" : 0,
    background: selected ? "#0f172a" : "#ffffff",
    color: selected ? "#ffffff" : "#334155",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  return (
    <div
      ref={mapFrameRef}
      className={`relative h-full min-h-[560px] w-full overflow-hidden border border-slate-200 bg-slate-100 text-slate-800 ${isFullscreen ? "h-screen w-screen rounded-none" : "rounded-3xl"}`}
    >
      <div ref={mapContainer} className="h-full w-full" />

      <div
        role="group"
        aria-label="Map style"
        className="absolute left-3 top-3 z-10 flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md"
      >
        <button type="button" aria-pressed={mode === "street"} style={modeButtonStyle(mode === "street")} onClick={() => setMode("street")}>
          Street
        </button>
        <button type="button" aria-pressed={mode === "satellite"} style={modeButtonStyle(mode === "satellite", true)} onClick={() => setMode("satellite")}>
          Satellite
        </button>
        <button type="button" aria-pressed={mode === "3d"} style={modeButtonStyle(mode === "3d", true)} onClick={() => setMode("3d")} title="Tilted satellite view with 3D terrain and buildings">
          3D
        </button>
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          aria-label={isFullscreen ? "Exit full screen map" : "Open full screen map"}
          title={isFullscreen ? "Exit full screen" : "Full screen map"}
          style={{ ...modeButtonStyle(isFullscreen, true), width: 36, padding: 8 }}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      <div className="absolute right-3 top-[68px] z-10 flex gap-2">
        <button
          type="button"
          onClick={requestLocation}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-3 py-2 text-xs font-bold shadow-md hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          {locationStatus === "requesting" ? "Requesting GPS..." : "My location"}
        </button>
        <button
          type="button"
          onClick={useJaipurCenter}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-3 py-2 text-xs font-bold shadow-md hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Jaipur center
        </button>
        <button
          type="button"
          onClick={refreshFacilities}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-3 py-2 text-xs font-bold shadow-md hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Search nearby
        </button>
      </div>

      <div className="absolute right-3 top-[116px] z-10">
        {isTracking ? (
          <button type="button" onClick={stopGpsSharing} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-800">
            Stop GPS sharing
          </button>
        ) : (
          <button type="button" onClick={() => setGpsPanelOpen((open) => !open)} className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-3 py-2 text-xs font-bold shadow-md hover:bg-slate-50 dark:hover:bg-slate-800" aria-expanded={gpsPanelOpen}>
            Share GPS
          </button>
        )}

        {gpsPanelOpen && !isTracking && (
          <section className="absolute right-0 top-11 w-[min(280px,calc(100vw-1.5rem))] rounded-lg border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 p-3 shadow-xl backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-extrabold">Ambulance GPS</h2>
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" aria-label="GPS sharing inactive" />
            </div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600" htmlFor="tracking-ambulance">
              Vehicle
            </label>
            <select
              id="tracking-ambulance"
              value={trackingId}
              onChange={(event) => setTrackingAmbulanceId(event.target.value)}
              disabled={ambulances.length === 0}
              className="mb-2 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-medium"
            >
              {ambulances.length === 0 && <option value="">No ambulance records</option>}
              {ambulances.map((ambulance) => (
                <option key={ambulance.id} value={ambulance.id}>{ambulance.id} · {ambulance.status}</option>
              ))}
            </select>
            <button type="button" onClick={startGpsSharing} disabled={!canWriteGps || !trackingId} className="w-full rounded-md bg-teal-700 px-3 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              Start GPS sharing
            </button>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
              {canWriteGps ? "Location updates sync through Supabase Realtime. Driver identity is not authenticated in this demo." : "Connect live Supabase data with persisted ambulance records to enable GPS writes."}
            </p>
            {trackingError && <p role="alert" className="mt-2 rounded-md bg-rose-50 p-2 text-[11px] text-rose-800">{trackingError}</p>}
          </section>
        )}
      </div>

      <section className="absolute bottom-3 left-3 z-10 w-[min(320px,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 shadow-xl backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setFacilityPanelOpen((open) => !open)}
          aria-expanded={facilityPanelOpen}
          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
        >
          <span className="min-w-0">
            <span className="block text-xs font-extrabold">Facilities · {facilities.length}</span>
            <span className="block truncate text-[10px] text-slate-500">
              {selectedFacility && activeRoute
                ? `${selectedFacility.name} · ${activeRoute.result.distanceKm.toFixed(1)} km · ${Math.max(1, Math.round(activeRoute.result.durationMinutes))} min`
                : `${hospitals.length} network hospitals · ${osmFacilities.length} OSM results`}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {!isLive || isUsingMockData ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-bold text-amber-900">DEMO</span> : null}
            <span aria-hidden="true" className="text-sm text-slate-500">{facilityPanelOpen ? "−" : "+"}</span>
          </span>
        </button>

        {facilityPanelOpen && (
          <div className="border-t border-slate-200">
            {locationError && (
              <p className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                {locationError}
              </p>
            )}
            {facilityError && (
              <p role="alert" className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                OpenStreetMap discovery is unavailable; saved network hospitals are still shown.
              </p>
            )}

            <div className="max-h-[24vh] overflow-y-auto p-2">
              {facilities.slice(0, 12).map((facility) => (
                <button
                  key={facility.id}
                  type="button"
                  onClick={() => selectFacility(facility)}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-slate-100 ${selectedFacility?.id === facility.id ? "bg-teal-50" : ""}`}
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${facility.source === "network" ? "bg-blue-600" : "bg-orange-500"}`} />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">{facility.name}</span>
                  <span className="shrink-0 text-[10px] capitalize text-slate-500">{facility.category.replaceAll("_", " ")}</span>
                </button>
              ))}
              {facilityStatus === "loading" && <p className="px-2 py-2 text-[10px] text-slate-500">Searching nearby OpenStreetMap facilities...</p>}
              {facilityStatus === "ready" && facilities.length === 0 && (
                <p className="px-2 py-3 text-xs text-slate-500">No facilities found in the search radius.</p>
              )}
            </div>

            {selectedFacility && (
              <div className="border-t border-slate-200 bg-slate-50 px-3 py-2.5 text-xs">
                <div className="font-bold">Route to {selectedFacility.name}</div>
                {!routeOrigin && <p className="mt-1 text-slate-500">Allow location access or select Jaipur center to calculate a route.</p>}
                {routeOrigin && !activeRoute && <p className="mt-1 text-slate-500">Calculating OSRM road route...</p>}
                {activeRoute && (
                  <p className="mt-1 text-slate-600">
                    {activeRoute.result.distanceKm.toFixed(1)} km · {Math.max(1, Math.round(activeRoute.result.durationMinutes))} min · {activeRoute.result.isRoadRoute ? "OSRM road route" : "straight-line estimate"}
                  </p>
                )}
                {locationStatus === "fallback" && activeRoute && <p className="mt-1 text-[10px] text-slate-500">Origin is the Jaipur city-center reference, not device GPS.</p>}
              </div>
            )}
          </div>
        )}
      </section>

      {(selectedFacility || selectedAmbulance) && (
        <section
          aria-label={selectedFacility ? `${selectedFacility.name} details` : `${selectedAmbulance.id} details`}
          className="absolute bottom-3 right-3 z-10 max-h-[52vh] w-[min(360px,calc(100vw-1.5rem))] overflow-y-auto rounded-lg border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {selectedFacility ? <Building2 className="h-4 w-4 shrink-0 text-teal-700" /> : <Truck className="h-4 w-4 shrink-0 text-cyan-700" />}
              <div className="min-w-0">
                <h2 className="truncate text-sm font-extrabold">
                  {selectedFacility?.name ?? selectedAmbulance.id}
                </h2>
                <p className="text-[10px] capitalize text-slate-500">
                  {selectedFacility?.category ?? `${selectedAmbulance.status} ambulance`}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close map details"
              onClick={() => {
                setSelectedFacility(null);
                onSelectAmbulance?.(null);
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {selectedNetworkHospital ? (
            <>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div className="rounded-md bg-slate-50 p-2">
                  <p className="text-[10px] font-semibold text-slate-500">General beds</p>
                  <p className="mt-0.5 text-sm font-extrabold text-slate-800">
                    {Math.max(0, selectedNetworkHospital.total_beds - selectedNetworkHospital.occupied_beds)} available
                  </p>
                  <p className="text-[10px] text-slate-500">of {selectedNetworkHospital.total_beds}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-2">
                  <p className="text-[10px] font-semibold text-slate-500">ICU beds</p>
                  <p className="mt-0.5 text-sm font-extrabold text-slate-800">{selectedNetworkHospital.icuBedsAvailable} available</p>
                  <p className="text-[10px] text-slate-500">of {selectedNetworkHospital.icuBedsTotal}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-2">
                  <p className="text-[10px] font-semibold text-slate-500">Ventilators</p>
                  <p className="mt-0.5 text-sm font-extrabold text-slate-800">{selectedNetworkHospital.ventilatorsAvailable} available</p>
                </div>
                <div className="rounded-md bg-slate-50 p-2">
                  <p className="text-[10px] font-semibold text-slate-500">Oxygen</p>
                  <p className="mt-0.5 text-sm font-extrabold capitalize text-slate-800">{selectedNetworkHospital.oxygenStatus}</p>
                </div>
              </div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500">Availability from current network data</span>
                <button
                  type="button"
                  onClick={() => void onRefreshAvailability?.()}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="h-3 w-3" /> Refresh
                </button>
              </div>
              {idleAmbulances.length > 0 ? (
                <div className="flex gap-2">
                  <select
                    aria-label="Choose an idle ambulance"
                    value={dispatchTargetId}
                    onChange={(event) => setDispatchTargetAmbulanceId(event.target.value)}
                    className="h-9 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium"
                  >
                    {idleAmbulances.map((ambulance) => (
                      <option key={ambulance.id} value={ambulance.id}>{ambulance.id} · idle</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!dispatchTargetId || dispatchingAmbulanceId === dispatchTargetId}
                    onClick={() => void onDispatchToHospital?.(dispatchTargetId, selectedNetworkHospital.id)}
                    className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md bg-teal-700 px-3 py-2 text-xs font-extrabold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    {dispatchingAmbulanceId === dispatchTargetId ? "Dispatching..." : "Dispatch here"}
                  </button>
                </div>
              ) : (
                <p className="rounded-md bg-amber-50 px-2.5 py-2 text-[11px] font-semibold text-amber-900">
                  No idle ambulances are available to dispatch.
                </p>
              )}
            </>
          ) : selectedFacility ? (
            <p className="rounded-md bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900">
              No live bed or resource availability is reported for this OpenStreetMap facility. Dispatch destinations require a network hospital record.
            </p>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-2"><span className="text-slate-500">Status</span><strong className="capitalize">{selectedAmbulance.status}</strong></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">Current position</span><strong className="font-mono">{selectedAmbulance.lat.toFixed(4)}, {selectedAmbulance.lng.toFixed(4)}</strong></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">Destination</span><strong className="text-right">{hospitals.find((hospital) => hospital.id === selectedAmbulance.assigned_hospital_id)?.name ?? "Unassigned"}</strong></div>
              {selectedAmbulance.patient_condition && <p className="border-t border-slate-200 pt-2 text-slate-600">{selectedAmbulance.patient_condition}</p>}
              <button
                type="button"
                onClick={() => {
                  setTrackingAmbulanceId(selectedAmbulance.id);
                  setGpsPanelOpen(true);
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Share this unit's GPS
              </button>
            </div>
          )}

          {selectedFacility && routeOrigin && (
            <div className="mt-3 border-t border-slate-200 pt-2 text-[11px] text-slate-600">
              {!activeRoute ? "Calculating route..." : `${activeRoute.result.distanceKm.toFixed(1)} km · ${Math.max(1, Math.round(activeRoute.result.durationMinutes))} min · ${activeRoute.result.isRoadRoute ? "OSRM route" : "straight-line estimate"}`}
            </div>
          )}
        </section>
      )}

      {locationStatus === "ready" && userLocation && !selectedFacility && !selectedAmbulance && (
        <div className="absolute bottom-3 right-3 z-10 rounded-md bg-white/90 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 shadow">
          GPS location active
        </div>
      )}
    </div>
  );
}
