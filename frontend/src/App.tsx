import { useState, useEffect, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import 'leaflet/dist/leaflet.css'

import Navbar from './components/Navbar'
import HeroWeatherCard from './components/HeroWeatherCard'
import ChatPanel from './components/ChatPanel'
import AlertBanner from './components/AlertBanner'
import TrendChart from './components/TrendChart'
import WeatherMap from './components/WeatherMap'
import ResilienceIndicator from './components/ResilienceIndicator'
import DemoMode from './components/DemoMode'
import FarmingCalendar from './components/FarmingCalendar'
import ToastAlert from './components/ToastAlert'
import ShareModal from './components/ShareModal'
import IMDBulletinModal from './components/IMDBulletinModal'
import LocationSetupModal from './components/LocationSetupModal'
import GlobeScrollDemo from './components/ui/landing-page'

import { useWeather } from './hooks/useWeather'
import { useAmbientSound } from './hooks/useAmbientSound'
import type { UnitSystem } from './utils/units'

// Weather condition + Time-of-day dynamic class resolver (Requirement 13)
function getTimeOfDayClass(hour: number): string {
  if (hour >= 5 && hour < 11) return 'time-dawn'
  if (hour >= 11 && hour < 17) return 'time-day'
  if (hour >= 17 && hour < 20) return 'time-sunset'
  return 'time-night'
}

function getWeatherBgClass(iconCode: string, hour: number, hasExtremeAlert = false): string {
  if (hasExtremeAlert) return 'weather-bg-extreme'
  const timeClass = getTimeOfDayClass(hour)
  const map: Record<string, string> = {
    sunny: `weather-bg-sunny ${timeClass}`,
    partly_cloudy: 'weather-bg-partly_cloudy',
    cloudy: 'weather-bg-cloudy',
    rain: 'weather-bg-rain',
    heavy_rain: 'weather-bg-heavy_rain',
    drizzle: 'weather-bg-drizzle',
    thunderstorm: 'weather-bg-thunderstorm',
    fog: 'weather-bg-fog',
    snow: 'weather-bg-snow',
  }
  return map[iconCode] || `weather-bg-partly_cloudy ${timeClass}`
}

export default function App() {
  const {
    location,
    setLocation,
    resolvedLocation,
    alerts,
    history,
    messages,
    isLoading,
    isChatLoading,
    isHistoryLoading,
    language,
    setLanguage,
    sendMessage,
    lastSource,
  } = useWeather()

  // App Toggles & Persona States
  const [demoOpen, setDemoOpen] = useState(false)
  const [heroWeather, setHeroWeather] = useState<any>(null)
  const [heroLoading, setHeroLoading] = useState(false)
  const [heroStale, setHeroStale] = useState(false)
  const [bgClass, setBgClass] = useState('weather-bg-partly_cloudy time-day')
  const [unit, setUnit] = useState<UnitSystem>('metric')
  const [lowBandwidth, setLowBandwidth] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [sectorMode, setSectorMode] = useState<'general' | 'farmer' | 'citizen' | 'researcher'>('general')
  const [viewMode, setViewMode] = useState<'dashboard' | 'landing'>('landing')
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number } | null>(null)

  // Map Theme (Dark vs Light) — default dark, persisted to localStorage (Requirement 5)
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('weathergpt_map_theme') as 'dark' | 'light') || 'dark'
    } catch {
      return 'dark'
    }
  })

  // Location Setup Modal state (Requirement 1 — no more hardcoded default Mumbai)
  const [locationModalOpen, setLocationModalOpen] = useState(false)

  // Modals & In-App Toast
  const [shareOpen, setShareOpen] = useState(false)
  const [bulletinOpen, setBulletinOpen] = useState(false)
  const [dismissedToasts, setDismissedToasts] = useState<Set<string>>(new Set())
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null)

  // Ambient sound synthesizer
  const { isPlaying: soundPlaying, toggleSound } = useAmbientSound(heroWeather?.icon_code || 'sunny')

  // Smooth scroll to top on viewMode change (Requirement 6 — fixes landing -> dashboard bottom scroll bug)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [viewMode])

  // Show location setup popup every time the user enters the dashboard (no persistence)
  useEffect(() => {
    if (viewMode === 'dashboard') {
      setLocationModalOpen(true)
    }
  }, [viewMode])

  // Fetch current weather for hero card with localStorage offline cache (Requirement 6)
  const fetchCurrentWeather = useCallback(async (loc: string, targetCoords?: { lat: number; lon: number }) => {
    if (!loc || !loc.trim()) return

    setHeroLoading(true)
    const cacheKey = `weathergpt_offline_${loc.toLowerCase().trim()}`

    try {
      let lat = targetCoords?.lat
      let lon = targetCoords?.lon

      if (lat === undefined || lon === undefined) {
        const geoResp = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1&language=en&format=json`
        )
        if (geoResp.ok) {
          const geoData = await geoResp.json()
          if (geoData.results?.length > 0) {
            lat = geoData.results[0].latitude
            lon = geoData.results[0].longitude
          }
        }
      }

      if (lat !== undefined && lon !== undefined) {
        setCurrentCoords({ lat, lon })
      }

      const queryLat = lat ?? 20.5937
      const queryLon = lon ?? 78.9629

      const weatherResp = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${queryLat}&longitude=${queryLon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weathercode&timezone=auto`
      )

      if (weatherResp.ok) {
        const wd = await weatherResp.json()
        const c = wd.current
        const wmoMap: Record<number, [string, string]> = {
          0: ['Clear Sky', 'sunny'],
          1: ['Mainly Clear', 'sunny'],
          2: ['Partly Cloudy', 'partly_cloudy'],
          3: ['Overcast', 'cloudy'],
          45: ['Foggy', 'fog'],
          48: ['Icy Fog', 'fog'],
          51: ['Light Drizzle', 'drizzle'],
          53: ['Drizzle', 'drizzle'],
          55: ['Heavy Drizzle', 'drizzle'],
          61: ['Light Rain', 'rain'],
          63: ['Rain Showers', 'rain'],
          65: ['Heavy Rain', 'heavy_rain'],
          80: ['Showers', 'rain'],
          81: ['Heavy Showers', 'heavy_rain'],
          82: ['Violent Showers', 'heavy_rain'],
          95: ['Thunderstorm', 'thunderstorm'],
          96: ['Thunderstorm with Hail', 'thunderstorm'],
        }

        const [condition, icon_code] = wmoMap[c.weathercode] || ['Clear Sky', 'sunny']
        const currentHour = new Date().getHours()

        const weatherObj = {
          temp_c: c.temperature_2m,
          feels_like_c: c.apparent_temperature,
          humidity_pct: c.relative_humidity_2m,
          wind_kmh: c.wind_speed_10m,
          rain_mm: c.precipitation || 0,
          condition,
          icon_code,
          lat: queryLat,
          lon: queryLon,
          timezone: wd.timezone,
        }

        setHeroWeather(weatherObj)
        setBgClass(getWeatherBgClass(icon_code, currentHour))
        setHeroStale(false)
        setOfflineNotice(null)

        // Cache successful response to localStorage
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ data: weatherObj, timestamp: Date.now() }))
        } catch {
          // ignore storage quota
        }
      } else {
        throw new Error('Upstream failed')
      }
    } catch (err) {
      console.warn('Network issue fetching live weather, checking localStorage cache:', err)
      setHeroStale(true)

      // Fallback from localStorage
      try {
        const cachedRaw = localStorage.getItem(cacheKey)
        if (cachedRaw) {
          const { data, timestamp } = JSON.parse(cachedRaw)
          setHeroWeather(data)
          const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          setOfflineNotice(`Offline Mode · Showing cached data for ${loc} from ${timeStr}`)
        }
      } catch {
        // no cache available
      }
    } finally {
      setHeroLoading(false)
    }
  }, [])

  // Central Unified Location Change Handler
  const handleLocationChange = useCallback(
    (loc: string, coords?: { lat: number; lon: number }) => {
      if (!loc || !loc.trim()) return
      setLocation(loc)
      if (coords) {
        setCurrentCoords(coords)
      }
      fetchCurrentWeather(loc, coords)
    },
    [setLocation, fetchCurrentWeather]
  )

  // Location chosen via first-time setup popup
  const handleLocationModalSelect = useCallback(
    (loc: string, coords?: { lat: number; lon: number }) => {
      setLocationModalOpen(false)
      handleLocationChange(loc, coords)
    },
    [handleLocationChange]
  )

  // Sync hero weather when resolved location updates from backend chat/alerts
  useEffect(() => {
    if (resolvedLocation) {
      setCurrentCoords({ lat: resolvedLocation.lat, lon: resolvedLocation.lon })
      fetchCurrentWeather(resolvedLocation.name, { lat: resolvedLocation.lat, lon: resolvedLocation.lon })
    }
  }, [resolvedLocation, fetchCurrentWeather])

  // No initial location load — user must always select via popup on dashboard entry

  // Update background when alerts change (e.g. Extreme alert triggers flame red)
  useEffect(() => {
    if (heroWeather) {
      const currentHour = new Date().getHours()
      const hasExtreme = alerts.some(a => a.severity === 'extreme')
      setBgClass(getWeatherBgClass(heroWeather.icon_code, currentHour, hasExtreme))
    }
  }, [alerts, heroWeather])

  // Map Theme Toggle handler
  const handleMapThemeToggle = useCallback(() => {
    setMapTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem('weathergpt_map_theme', next)
      } catch {
        // ignore storage error
      }
      return next
    })
  }, [])

  const handleDemoScenario = useCallback(async (loc: string, question: string) => {
    setDemoOpen(false)
    handleLocationChange(loc)
    if (loc.toLowerCase().includes('nagpur')) {
      setSectorMode('farmer')
    } else if (loc.toLowerCase().includes('chennai')) {
      setSectorMode('citizen')
    } else {
      setSectorMode('researcher')
    }
    setTimeout(() => sendMessage(question), 400)
  }, [handleLocationChange, sendMessage])

  const displayLocation = resolvedLocation?.display_name || resolvedLocation?.name || location || 'India'

  // Farming calendar forecast
  const farmingForecast = useMemo(() => {
    if (!history || history.length === 0) return []
    return history.map(h => ({
      date: h.date,
      max_temp_c: h.max_temp_c,
      min_temp_c: h.min_temp_c,
      rain_mm: h.rain_mm,
      wind_kmh: h.wind_kmh,
      condition: h.rain_mm > 5 ? 'Rain Showers' : h.rain_mm > 0 ? 'Drizzle' : 'Partly Cloudy',
    }))
  }, [history])

  // Active coordinates for map
  const activeLat = currentCoords?.lat ?? resolvedLocation?.lat ?? heroWeather?.lat ?? null
  const activeLon = currentCoords?.lon ?? resolvedLocation?.lon ?? heroWeather?.lon ?? null

  return (
    <div
      className={`min-h-screen transition-colors duration-1000 ${bgClass} ${
        lowBandwidth ? 'low-bandwidth-mode' : ''
      } ${highContrast ? 'high-contrast-mode' : ''} relative selection:bg-indigo-500 selection:text-white`}
    >
      {/* Dynamic Background Gradient Mesh / Ambient Lighting */}
      {!lowBandwidth && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-opacity duration-1000">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/15 blur-3xl" />
          <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-sky-500/15 blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-purple-500/15 blur-3xl" />
        </div>
      )}

      {/* Real-time In-App Toast Notification (Requirement 8) */}
      <ToastAlert
        alerts={alerts}
        locationName={displayLocation}
        dismissedToasts={dismissedToasts}
        onDismiss={type => setDismissedToasts(prev => new Set([...prev, type]))}
      />

      {/* Location Setup Popup Modal on First Dashboard Load (Requirement 1) */}
      <LocationSetupModal
        isOpen={locationModalOpen && viewMode === 'dashboard'}
        onSelectLocation={handleLocationModalSelect}
      />

      <div className="relative z-10">
        {/* Navigation Header — only shown on dashboard, not on the landing page */}
        {viewMode === 'dashboard' && (
          <Navbar
            location={location}
            onLocationChange={handleLocationChange}
            onDemoToggle={() => setDemoOpen(o => !o)}
            demoOpen={demoOpen}
            unit={unit}
            onUnitToggle={() => setUnit(u => (u === 'metric' ? 'imperial' : 'metric'))}
            lowBandwidth={lowBandwidth}
            onLowBandwidthToggle={() => setLowBandwidth(b => !b)}
            highContrast={highContrast}
            onHighContrastToggle={() => setHighContrast(c => !c)}
            soundPlaying={soundPlaying}
            onSoundToggle={toggleSound}
            mapTheme={mapTheme}
            onMapThemeToggle={handleMapThemeToggle}
            viewMode={viewMode}
            onViewModeToggle={() => {
              window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
              setViewMode(v => (v === 'dashboard' ? 'landing' : 'dashboard'))
            }}
            onOpenLocationModal={() => setLocationModalOpen(true)}
          />
        )}

        {/* Offline Cache Notice Banner (Requirement 6) */}
        <AnimatePresence>
          {offlineNotice && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-7xl mx-auto px-4 md:px-8 pt-3"
            >
              <div className="p-3 rounded-2xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="text-base animate-pulse">📡</span>
                  <span className="font-bold">{offlineNotice}</span>
                </div>
                <button
                  onClick={() => setOfflineNotice(null)}
                  className="text-white/60 hover:text-white font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ScrollGlobe Landing View vs Live Dashboard */}
        {viewMode === 'landing' ? (
          <GlobeScrollDemo
            onLaunchApp={() => {
              window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
              setViewMode('dashboard')
            }}
          />
        ) : (
          <>
            {/* Demo Mode Judging Panel */}
            <AnimatePresence>
              {demoOpen && (
                <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4">
                  <DemoMode isOpen={demoOpen} onSelectScenario={handleDemoScenario} />
                </div>
              )}
            </AnimatePresence>

            {/* Main Content Dashboard */}
            <main id="weathergpt-dashboard" className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-5">
              {/* Row 1: Hero Weather (4 cols) + Conversational Chat (8 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-4 h-full">
                  <HeroWeatherCard
                    locationName={displayLocation}
                    currentWeather={heroWeather}
                    isLoading={heroLoading}
                    alerts={alerts}
                    unit={unit}
                    isStale={heroStale}
                    onOpenShare={() => setShareOpen(true)}
                    onOpenBulletin={() => setBulletinOpen(true)}
                  />
                </div>

                <div className="lg:col-span-8 h-full">
                  <ChatPanel
                    messages={messages}
                    onSendMessage={sendMessage}
                    isLoading={isChatLoading}
                    location={displayLocation}
                    alerts={alerts}
                    currentWeather={heroWeather}
                    sectorMode={sectorMode}
                    onSectorModeChange={setSectorMode}
                    language={language}
                    onLanguageChange={setLanguage}
                  />
                </div>
              </div>

              {/* Row 2: Prominent Alert Banners / All Clear Status (Full Width) */}
              <div className="w-full">
                <AlertBanner
                  alerts={alerts}
                  locationName={displayLocation}
                  stale={heroStale}
                  onOpenBulletin={() => setBulletinOpen(true)}
                />
              </div>

              {/* Row 2.5: Weekly Farming Calendar View (Requirement 7 — shown in Farmer Mode) */}
              {(sectorMode === 'farmer' || location.toLowerCase().includes('nagpur')) && (
                <FarmingCalendar
                  forecast={farmingForecast}
                  unit={unit}
                  locationName={displayLocation}
                />
              )}

              {/* Row 3: 7-Day Trend Chart (6 cols) + Regional Map (6 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-6 h-full">
                  <TrendChart
                    history={history}
                    isLoading={isHistoryLoading}
                    locationName={displayLocation}
                    unit={unit}
                  />
                </div>

                <div className="lg:col-span-6 h-full">
                  <WeatherMap
                    lat={activeLat}
                    lon={activeLon}
                    locationName={displayLocation}
                    alerts={alerts}
                    isLoading={isLoading}
                    lowBandwidth={lowBandwidth}
                    mapTheme={mapTheme}
                    onLocationSelect={handleLocationChange}
                  />
                </div>
              </div>
            </main>

            {/* Floating Bottom-Right Resilience Pill — ONLY shown in Judge Demo mode inside Dashboard */}
            {demoOpen && (
              <div className="fixed bottom-4 right-4 z-40">
                <ResilienceIndicator lastSource={lastSource} />
              </div>
            )}

            {/* Shareable Advisory WhatsApp Card Modal (Requirement 9) */}
            <ShareModal
              isOpen={shareOpen}
              onClose={() => setShareOpen(false)}
              locationName={displayLocation}
              currentWeather={heroWeather}
              alerts={alerts}
              unit={unit}
            />

            {/* IMD-Style Bulletin Modal (Requirement 3) */}
            <IMDBulletinModal
              isOpen={bulletinOpen}
              onClose={() => setBulletinOpen(false)}
              locationName={displayLocation}
              currentWeather={heroWeather}
              alerts={alerts}
              unit={unit}
            />

            {/* Dashboard Footer */}
            <footer className="text-center pb-12 pt-6 border-t border-white/5 mt-8">
              <p className="text-xs text-white/50 font-medium">
                WeatherGPT · Smart India Hackathon (SIH 26068) · Ministry of Earth Sciences / IMD
              </p>
              <p className="text-[11px] text-white/30 mt-1">
                Data Feeds: Open-Meteo & OpenWeatherMap · AI Engine: Google Gemini 3.6 Flash & Groq Qwen
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
