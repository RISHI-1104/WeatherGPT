import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { geocodeSearch, type GeocodeResult } from '../api/weatherApi'

interface LocationSetupModalProps {
  isOpen: boolean
  onSelectLocation: (locationName: string, coords?: { lat: number; lon: number }) => void
}

const POPULAR_CITIES = [
  { name: 'Delhi', state: 'National Capital Territory', lat: 28.6139, lon: 77.2090, icon: '🏛️' },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707, icon: '🌊' },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lon: 88.3639, icon: '🌉' },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lon: 77.5946, icon: '🌳' },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lon: 72.8777, icon: '🏙️' },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lon: 78.4867, icon: '💎' },
  { name: 'Nagpur', state: 'Maharashtra (Vidarbha Agri)', lat: 21.1458, lon: 79.0882, icon: '🌾' },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lon: 75.7873, icon: '🏰' },
]

export default function LocationSetupModal({ isOpen, onSelectLocation }: LocationSetupModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [searching, setSearching] = useState(false)
  const [gpsDetecting, setGpsDetecting] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  const handleQueryChange = useCallback((val: string) => {
    setQuery(val)
    setGpsError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await geocodeSearch(val.trim())
        setResults(res)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 280)
  }, [])

  const handleSelect = (name: string, coords?: { lat: number; lon: number }) => {
    onSelectLocation(name, coords)
  }

  const handleGpsDetect = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.')
      return
    }

    setGpsDetecting(true)
    setGpsError(null)

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
            handleSelect(detected, { lat: latitude, lon: longitude })
          } else {
            handleSelect(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`, { lat: latitude, lon: longitude })
          }
        } catch {
          handleSelect('Delhi', { lat: 28.6139, lon: 77.2090 })
        } finally {
          setGpsDetecting(false)
        }
      },
      (err) => {
        setGpsDetecting(false)
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('GPS permission was denied. Please type your city name manually below.')
        } else {
          setGpsError('Unable to acquire GPS fix. Please search your city manually.')
        }
      },
      { timeout: 9000 }
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg rounded-3xl bg-slate-900/95 border border-white/20 p-6 md:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {/* Ambient Lighting Gradient */}
            <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="text-center relative z-10 mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400/20 to-indigo-500/20 border border-sky-400/30 text-3xl mb-3 shadow-inner">
                <span>📍</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-display">
                Set Your Location
              </h2>
              <p className="text-xs md:text-sm text-white/60 mt-1 max-w-sm mx-auto">
                Personalize real-time forecasts, IMD alerts, agricultural calendars, and AI reasoning for your region.
              </p>
            </div>

            {/* GPS Auto-Detect Button */}
            <div className="relative z-10 mb-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleGpsDetect}
                disabled={gpsDetecting}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {gpsDetecting ? (
                  <>
                    <span className="animate-spin text-base">⏳</span>
                    <span>Detecting live GPS coordinates...</span>
                  </>
                ) : (
                  <>
                    <span className="text-base">🎯</span>
                    <span>Use My Current Live Location</span>
                  </>
                )}
              </motion.button>
              {gpsError && (
                <p className="text-xs text-amber-300 bg-amber-500/15 border border-amber-400/30 rounded-xl p-2.5 mt-2 text-center">
                  ⚠️ {gpsError}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="relative z-10 flex items-center my-4">
              <div className="flex-1 border-t border-white/10" />
              <span className="px-3 text-xs font-bold text-white/40 uppercase tracking-wider">or search city</span>
              <div className="flex-1 border-t border-white/10" />
            </div>

            {/* Manual Search Bar */}
            <div className="relative z-10 mb-4">
              <div className="relative flex items-center">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-white/50 pointer-events-none">
                  {searching ? '⏳' : '🔍'}
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && query.trim()) {
                      handleSelect(query.trim())
                    }
                  }}
                  placeholder="Enter Indian city, district, or PIN..."
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-sky-400 focus:bg-white/15 transition-all shadow-inner"
                />
              </div>

              {/* Autocomplete Results Dropdown */}
              {results.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-2xl bg-slate-950/95 border border-white/20 shadow-2xl divide-y divide-white/5 custom-scroll">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelect(r.name, { lat: r.lat, lon: r.lon })}
                      className="w-full text-left px-4 py-2.5 hover:bg-sky-500/20 text-xs flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span>📍</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white truncate">{r.name}</p>
                        <p className="text-[10px] text-white/50 truncate">{r.display_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Popular Quick Selection Chips */}
            <div className="relative z-10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-2">
                Popular Hubs & Agricultural Belts:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {POPULAR_CITIES.map(city => (
                  <button
                    key={city.name}
                    onClick={() => handleSelect(city.name, { lat: city.lat, lon: city.lon })}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-sky-400/40 text-left transition-all cursor-pointer group flex items-center gap-2"
                  >
                    <span className="text-base group-hover:scale-110 transition-transform">{city.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white group-hover:text-sky-300 truncate">{city.name}</p>
                      <p className="text-[9px] text-white/40 truncate">{city.state}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
