import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import L from 'leaflet'
import type { Alert } from '../api/weatherApi'

// ─── Map Shimmer Skeleton ───────────────────────────────────────────────────

export function MapSkeleton() {
  return (
    <div className="glass-card h-full flex flex-col justify-between min-h-[380px]">
      <div className="flex items-center justify-between mb-3">
        <div className="skeleton h-6 w-40 rounded-lg" />
        <div className="skeleton h-6 w-24 rounded-full" />
      </div>
      <div className="skeleton w-full flex-1 rounded-2xl min-h-[280px]" />
    </div>
  )
}

// ─── Weather Map Component ──────────────────────────────────────────────────

interface WeatherMapProps {
  lat: number | null
  lon: number | null
  locationName: string | null
  alerts: Alert[]
  isLoading: boolean
  lowBandwidth?: boolean
  mapTheme?: 'dark' | 'light'
  onLocationSelect?: (locationName: string, coords: { lat: number; lon: number }) => void
}

// Guaranteed keyless tile sources - no API key ever required
// Light: standard OpenStreetMap tiles (always free, no key)
// Dark: OpenStreetMap tiles with a CSS filter applied for a dark look (see className below)
// This avoids depending on any third-party gated tile provider (CARTO, Mapbox, etc.)
function getTileUrl(): string {
  return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
}

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

export default function WeatherMap({
  lat,
  lon,
  locationName,
  alerts,
  isLoading,
  lowBandwidth = false,
  mapTheme = 'dark',
  onLocationSelect,
}: WeatherMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markerGroupRef = useRef<L.LayerGroup | null>(null)

  // Initialize map once (only in normal bandwidth mode)
  useEffect(() => {
    if (lowBandwidth || !mapContainerRef.current) return

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const defaultLat = lat ?? 20.5937
    const defaultLon = lon ?? 78.9629
    const zoomLevel = lat !== null ? 9 : 5

    // Fix default marker asset paths
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLon],
      zoom: zoomLevel,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
    })

    // Guaranteed keyless OpenStreetMap tiles - never shows "API key required"
    const tileLayer = L.tileLayer(getTileUrl(), {
      attribution: TILE_ATTRIBUTION,
      subdomains: 'abc',
      maxZoom: 19,
    }).addTo(map)

    tileLayerRef.current = tileLayer

    // Glassmorphic zoom controls
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const markerGroup = L.layerGroup().addTo(map)
    markerGroupRef.current = markerGroup
    mapInstanceRef.current = map

    // Map-Click Location Selection Handler
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const clickLat = e.latlng.lat
      const clickLon = e.latlng.lng

      // Temporary popup indicating resolution
      const tempPopup = L.popup()
        .setLatLng([clickLat, clickLon])
        .setContent('<div style="font-family:sans-serif;font-size:12px;padding:2px;">📍 Resolving place name...</div>')
        .openOn(map)

      try {
        const resp = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${clickLat}&longitude=${clickLon}&localityLanguage=en`
        )
        if (resp.ok) {
          const data = await resp.json()
          const resolvedName =
            data.city || data.locality || data.principalSubdivision || `${clickLat.toFixed(2)}°N, ${clickLon.toFixed(2)}°E`

          tempPopup.setContent(
            `<div style="font-family:sans-serif;font-size:12px;padding:2px;font-weight:bold;color:#0284c7;">📍 ${resolvedName}</div>`
          )

          if (onLocationSelect) {
            onLocationSelect(resolvedName, { lat: clickLat, lon: clickLon })
          }
        }
      } catch {
        const fallbackName = `${clickLat.toFixed(2)}°N, ${clickLon.toFixed(2)}°E`
        if (onLocationSelect) {
          onLocationSelect(fallbackName, { lat: clickLat, lon: clickLon })
        }
      }
    })

    setTimeout(() => {
      map.invalidateSize()
    }, 200)

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [lowBandwidth])

  // Apply/remove dark CSS filter on the container when mapTheme changes
  // (tile source stays the same reliable OSM source; only the visual filter changes)
  useEffect(() => {
    const container = mapContainerRef.current
    if (!container) return

    if (mapTheme === 'dark') {
      container.style.filter =
        'invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9) saturate(0.8)'
    } else {
      container.style.filter = 'none'
    }
  }, [mapTheme])

  // Update map position and markers when coordinates or alerts change
  useEffect(() => {
    if (lowBandwidth) return
    const map = mapInstanceRef.current
    const markerGroup = markerGroupRef.current
    if (!map || !markerGroup || lat === null || lon === null) return

    // Fly smoothly to target city
    map.flyTo([lat, lon], 10, {
      animate: true,
      duration: 1.2,
      easeLinearity: 0.25,
    })

    // Clear previous markers
    markerGroup.clearLayers()

    // 1. Radar Circle for Searched Location
    L.circle([lat, lon], {
      color: '#38bdf8',
      fillColor: '#0284c7',
      fillOpacity: 0.18,
      radius: 8000,
      weight: 1.5,
    }).addTo(markerGroup)

    // 2. Custom Glowing City Marker
    const locationDivIcon = L.divIcon({
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(56, 189, 248, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #38bdf8, #6366f1); border: 2px solid white; box-shadow: 0 0 16px rgba(56, 189, 248, 0.8); display: flex; align-items: center; justify-content: center; font-size: 16px;">
            📍
          </div>
        </div>
      `,
      className: '',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    })

    const cityMarker = L.marker([lat, lon], { icon: locationDivIcon })
      .addTo(markerGroup)
      .bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px;">
          <h4 style="margin:0 0 4px 0; font-size: 15px; font-weight: 800; color: #1e293b;">📍 ${locationName || 'Selected Location'}</h4>
          <p style="margin:0; font-size: 11px; color: #64748b;">
            Coordinates: <strong>${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E</strong>
          </p>
          <p style="margin:4px 0 0 0; font-size: 11px; color: #0284c7; font-weight: 600;">
            Click anywhere on the map to switch location 🎯
          </p>
        </div>
      `)

    // Open popup initially
    setTimeout(() => {
      cityMarker.openPopup()
    }, 600)

    // 3. Active Alert Markers around vicinity
    alerts.forEach((alert, idx) => {
      const isExtreme = alert.severity === 'extreme'
      const isSevere = alert.severity === 'severe'
      const color = isExtreme ? '#ef4444' : isSevere ? '#f97316' : '#eab308'

      const offsetLat = lat + (idx % 2 === 0 ? 0.04 : -0.04) * (idx + 1)
      const offsetLon = lon + (idx % 2 === 0 ? 0.04 : -0.04) * (idx + 1)

      const alertIcon = L.divIcon({
        html: `
          <div style="
            padding: 5px 10px; border-radius: 999px;
            background: ${color}E6;
            border: 1.5px solid #ffffff;
            box-shadow: 0 4px 15px ${color}80;
            font-size: 12px; font-weight: 800; color: #ffffff;
            font-family: 'Plus Jakarta Sans', sans-serif;
            display: flex; align-items: center; gap: 4px;
            white-space: nowrap;
          ">
            <span>${alert.icon}</span>
            <span>${alert.label}</span>
          </div>
        `,
        className: '',
        iconAnchor: [40, 16],
      })

      L.marker([offsetLat, offsetLon], { icon: alertIcon })
        .addTo(markerGroup)
        .bindPopup(`
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
              <span style="font-size:16px;">${alert.icon}</span>
              <strong style="color:${color}; font-size:14px;">${alert.label}</strong>
            </div>
            <p style="margin:0 0 6px 0; font-size:11px; color:#334155;">${alert.message}</p>
            <div style="background:#f1f5f9; padding:4px 8px; border-radius:8px; font-size:11px; color:#0f172a;">
              Observed Value: <strong>${alert.value} ${alert.unit}</strong>
            </div>
          </div>
        `)
    })
  }, [lat, lon, locationName, alerts, lowBandwidth])

  if (isLoading && lat === null) return <MapSkeleton />

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card h-full flex flex-col justify-between min-h-[380px] relative overflow-hidden"
    >
      {/* Map Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗺️</span>
          <div>
            <h3 className="font-extrabold text-base text-white tracking-tight font-display">
              Regional Weather Map
            </h3>
            <p className="text-[11px] text-white/50">
              Interactive Map ({mapTheme === 'dark' ? 'Dark' : 'Light'}) · Click map to change location
            </p>
          </div>
        </div>

        {alerts.length > 0 ? (
          <span className="px-2.5 py-1 rounded-full bg-red-500/25 text-red-300 border border-red-500/40 text-xs font-extrabold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            {alerts.length} Alert Area{alerts.length > 1 ? 's' : ''}
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
            ● Normal Conditions
          </span>
        )}
      </div>

      {/* Low-Bandwidth Mode vs Live Map */}
      {lowBandwidth ? (
        <div className="flex-1 w-full rounded-2xl border border-white/15 min-h-[280px] p-5 flex flex-col justify-center items-center text-center bg-black/40">
          <span className="text-3xl mb-2">⚡</span>
          <p className="font-bold text-sm text-white">Low-Bandwidth Geospatial Mode</p>
          <p className="text-xs text-white/60 max-w-xs mt-1">
            Map tile downloads paused to preserve 2G/3G data bandwidth.
          </p>
          <div className="mt-3 p-2.5 rounded-xl bg-white/10 border border-white/10 text-xs font-mono text-emerald-300">
            Latitude: {lat?.toFixed(4)}° N | Longitude: {lon?.toFixed(4)}° E
          </div>
        </div>
      ) : (
        <div
          ref={mapContainerRef}
          id="weather-leaflet-map"
          className="flex-1 w-full rounded-2xl overflow-hidden border border-white/15 min-h-[280px] shadow-inner cursor-crosshair"
          style={{ zIndex: 0 }}
        />
      )}
    </motion.div>
  )
}