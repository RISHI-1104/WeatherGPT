import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { geocodeSearch, type GeocodeResult } from '../api/weatherApi'
import type { UnitSystem } from '../utils/units'

interface NavbarProps {
  location: string
  onLocationChange: (loc: string, coords?: { lat: number; lon: number }) => void
  onDemoToggle: () => void
  demoOpen: boolean
  unit: UnitSystem
  onUnitToggle: () => void
  lowBandwidth: boolean
  onLowBandwidthToggle: () => void
  highContrast: boolean
  onHighContrastToggle: () => void
  soundPlaying: boolean
  onSoundToggle: () => void
  mapTheme?: 'dark' | 'light'
  onMapThemeToggle?: () => void
  viewMode?: 'dashboard' | 'landing'
  onViewModeToggle?: () => void
  onOpenLocationModal?: () => void
}

export default function Navbar({
  location,
  onLocationChange,
  onDemoToggle,
  demoOpen,
  unit,
  onUnitToggle,
  lowBandwidth,
  onLowBandwidthToggle,
  highContrast,
  onHighContrastToggle,
  soundPlaying,
  onSoundToggle,
  mapTheme = 'dark',
  onMapThemeToggle,
  viewMode = 'dashboard',
  onViewModeToggle,
  onOpenLocationModal,
}: NavbarProps) {
  const [query, setQuery] = useState(location)
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searching, setSearching] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync internal search input with incoming location
  useEffect(() => {
    setQuery(location)
  }, [location])

  // Debounced geocode search
  const handleQueryChange = useCallback((val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await geocodeSearch(val.trim())
        setResults(res)
        setShowDropdown(res.length > 0)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 280)
  }, [])

  const selectResult = useCallback((r: GeocodeResult) => {
    setQuery(r.name)
    setShowDropdown(false)
    onLocationChange(r.name, { lat: r.lat, lon: r.lon })
  }, [onLocationChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      setShowDropdown(false)
      onLocationChange(query.trim())
    }
  }

  // GPS Auto-detect handler
  const handleGpsDetect = () => {
    if (!navigator.geolocation) {
      alert('📍 Geolocation is not supported by your browser.')
      return
    }
    setSearching(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          )
          if (res.ok) {
            const data = await res.json()
            const detected = data.city || data.locality || data.principalSubdivision || 'Detected City'
            setQuery(detected)
            onLocationChange(detected, { lat: latitude, lon: longitude })
          } else {
            onLocationChange(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`, { lat: latitude, lon: longitude })
          }
        } catch {
          onLocationChange('Delhi', { lat: 28.6139, lon: 77.2090 })
        } finally {
          setSearching(false)
        }
      },
      (err) => {
        setSearching(false)
        if (err.code === err.PERMISSION_DENIED) {
          alert('📍 Location access denied. Please search your city manually in the search bar.')
        } else {
          alert('📍 Unable to acquire GPS position. Please enter your city name manually.')
        }
      },
      { timeout: 8000 }
    )
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.closest('.search-wrapper')?.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="glass sticky top-0 z-50 px-4 py-3 md:px-8 border-t-0 border-x-0 rounded-b-3xl shadow-xl bg-slate-950/80 backdrop-blur-2xl"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 md:gap-4">
        
        {/* Logo & Hackathon Tag */}
        <div
          className="flex items-center gap-3 flex-shrink-0 cursor-pointer"
          onClick={() => onOpenLocationModal?.()}
          title="Click to switch location"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400/20 to-indigo-500/20 border border-white/20 flex items-center justify-center p-1.5 shadow-inner overflow-hidden">
            <img
              src="/logo.svg"
              alt="WeatherGPT Logo"
              className="w-full h-full object-contain drop-shadow"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg md:text-xl leading-none tracking-tight text-white font-display">
                WeatherGPT
              </h1>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold">
                SIH 26068
              </span>
            </div>
            <p className="text-[10px] text-white/50 font-semibold tracking-wider uppercase mt-0.5">
              Ministry of Earth Sciences · IMD
            </p>
          </div>
        </div>

        {/* Location Search Bar with GPS Icon */}
        <div className="search-wrapper flex-1 max-w-xs md:max-w-md relative hidden sm:block">
          <div className="relative flex items-center">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none text-white/50">
              {searching ? '⏳' : '📍'}
            </span>
            <input
              ref={inputRef}
              id="location-search"
              type="text"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => results.length > 0 && setShowDropdown(true)}
              placeholder="Search Indian city, district, or PIN..."
              className="glass-input w-full pl-9 pr-16 py-2 text-xs md:text-sm font-medium"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {query && (
                <button
                  onClick={() => { setQuery(''); inputRef.current?.focus() }}
                  className="text-white/40 hover:text-white text-xs cursor-pointer p-0.5"
                  title="Clear input"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                onClick={handleGpsDetect}
                className="w-6 h-6 rounded-lg bg-white/10 hover:bg-sky-500/30 text-white/70 hover:text-sky-300 flex items-center justify-center text-xs transition-all cursor-pointer border border-white/10"
                title="Auto-detect current GPS location"
              >
                🎯
              </button>
            </div>
          </div>

          {/* Autocomplete Dropdown */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="glass absolute top-full mt-2 left-0 right-0 z-50 overflow-hidden shadow-2xl bg-slate-950/95 border border-white/20 rounded-2xl divide-y divide-white/5"
              >
                {results.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => selectResult(r)}
                    className="w-full text-left px-4 py-3 text-xs hover:bg-white/10 transition-colors flex items-center gap-3 cursor-pointer"
                  >
                    <span className="text-base">📍</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white truncate">{r.name}</p>
                      <p className="text-[11px] text-white/50 truncate">{r.display_name}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Section: Decluttered Navigation & Unified Settings */}
        <div className="flex items-center gap-2 md:gap-2.5">
          
          {/* Overview / Landing Page Toggle */}
          {onViewModeToggle && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={onViewModeToggle}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                viewMode === 'landing'
                  ? 'bg-sky-500 text-slate-950 border border-sky-300'
                  : 'glass-btn border-sky-400/40 text-sky-300 hover:bg-sky-400/20'
              }`}
              title={viewMode === 'landing' ? 'Switch to Live Weather Dashboard' : 'View 3D ScrollGlobe Landing Overview'}
            >
              <span>🌍</span>
              <span className="hidden sm:inline">{viewMode === 'landing' ? 'Live Dashboard' : 'Overview'}</span>
            </motion.button>
          )}

          {/* Unified Settings Gear Popover */}
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setShowSettings(s => !s)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                showSettings || lowBandwidth || highContrast
                  ? 'bg-purple-500/30 text-purple-200 border-purple-400/40'
                  : 'bg-white/10 text-white/70 border-white/15 hover:text-white'
              }`}
              title="Preferences & Accessibility Settings"
            >
              ⚙️
            </motion.button>

            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="glass absolute top-full mt-2 right-0 p-4 rounded-2xl w-72 z-50 shadow-2xl bg-slate-950/95 border border-white/20 text-xs text-white"
                >
                  <p className="font-bold text-white border-b border-white/10 pb-2 mb-3 flex items-center justify-between">
                    <span>Preferences & Display</span>
                    <button onClick={() => setShowSettings(false)} className="text-white/50 hover:text-white font-bold">✕</button>
                  </p>

                  <div className="space-y-2.5">
                    {/* Unit System */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                      <div>
                        <p className="font-bold text-white">Temperature Unit</p>
                        <p className="text-[10px] text-white/50">Current: °{unit === 'imperial' ? 'F' : 'C'}</p>
                      </div>
                      <button
                        onClick={onUnitToggle}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/20 border border-sky-400/30 text-sky-200 cursor-pointer"
                      >
                        °{unit === 'imperial' ? 'F' : 'C'}
                      </button>
                    </div>

                    {/* Map Theme Toggle (Requirement 5) */}
                    {onMapThemeToggle && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                        <div>
                          <p className="font-bold text-white">Map Style</p>
                          <p className="text-[10px] text-white/50">{mapTheme === 'dark' ? '🌙 Dark Theme' : '☀️ Light Theme'}</p>
                        </div>
                        <button
                          onClick={onMapThemeToggle}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 cursor-pointer"
                        >
                          {mapTheme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                        </button>
                      </div>
                    )}

                    {/* Ambient Weather Sound */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                      <div>
                        <p className="font-bold text-white">Ambient Sound</p>
                        <p className="text-[10px] text-white/50">Procedural weather audio</p>
                      </div>
                      <button
                        onClick={onSoundToggle}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          soundPlaying ? 'bg-sky-500 text-slate-950' : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {soundPlaying ? '🔊 ON' : '🔇 OFF'}
                      </button>
                    </div>

                    {/* Low-Bandwidth Mode */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                      <div>
                        <p className="font-bold text-white">2G/3G Low-Bandwidth</p>
                        <p className="text-[10px] text-white/50">Text-only, pause heavy tiles</p>
                      </div>
                      <button
                        onClick={onLowBandwidthToggle}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          lowBandwidth ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {lowBandwidth ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    {/* High-Contrast / Large Text */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                      <div>
                        <p className="font-bold text-white">High Contrast & Large Font</p>
                        <p className="text-[10px] text-white/50">Enhanced rural accessibility</p>
                      </div>
                      <button
                        onClick={onHighContrastToggle}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          highContrast ? 'bg-amber-400 text-slate-950' : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {highContrast ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Demo Scenarios Button */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDemoToggle}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
              demoOpen
                ? 'bg-amber-500 text-slate-950 border border-amber-300'
                : 'glass-btn border-amber-400/40 text-amber-300 hover:bg-amber-400/20'
            }`}
          >
            <span>🎬</span>
            <span className="hidden sm:inline">Judge Demo</span>
          </motion.button>
        </div>

      </div>
    </motion.nav>
  )
}
