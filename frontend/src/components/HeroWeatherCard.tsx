import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { Alert } from '../api/weatherApi'
import { formatTemp, formatWind, formatRain, type UnitSystem } from '../utils/units'

// ─── Weather Condition Visualizer ───────────────────────────────────────────

const WEATHER_VISUALS: Record<string, { emoji: string; animClass: string; gradient: string; label: string }> = {
  sunny: { emoji: '☀️', animClass: 'animate-sun-glow', gradient: 'from-amber-400 to-orange-500', label: 'Clear Sky' },
  partly_cloudy: { emoji: '⛅', animClass: 'animate-cloud-drift', gradient: 'from-sky-400 to-amber-300', label: 'Partly Cloudy' },
  cloudy: { emoji: '☁️', animClass: 'animate-cloud-drift', gradient: 'from-slate-300 to-slate-500', label: 'Overcast' },
  rain: { emoji: '🌧️', animClass: 'animate-float', gradient: 'from-blue-400 to-indigo-500', label: 'Rain Showers' },
  heavy_rain: { emoji: '⛈️', animClass: 'animate-pulse', gradient: 'from-indigo-400 to-blue-700', label: 'Heavy Torrential Rain' },
  drizzle: { emoji: '🌦️', animClass: 'animate-float', gradient: 'from-sky-300 to-blue-400', label: 'Light Drizzle' },
  thunderstorm: { emoji: '⛈️', animClass: 'animate-bounce', gradient: 'from-purple-400 to-indigo-600', label: 'Severe Thunderstorm' },
  fog: { emoji: '🌫️', animClass: 'animate-cloud-drift', gradient: 'from-slate-400 to-gray-600', label: 'Dense Fog' },
  snow: { emoji: '❄️', animClass: 'animate-spin', gradient: 'from-sky-200 to-blue-300', label: 'Snow' },
}

function WeatherIcon({ iconCode }: { iconCode: string }) {
  const visual = WEATHER_VISUALS[iconCode] || { emoji: '🌤️', animClass: 'animate-float', gradient: 'from-amber-300 to-sky-400', label: 'Weather' }

  return (
    <div className="relative flex items-center justify-center">
      {/* Ambient Backlight Glow */}
      <div className={`absolute w-16 h-16 rounded-full blur-2xl opacity-40 bg-gradient-to-r ${visual.gradient}`} />
      <span className={`text-6xl sm:text-7xl select-none inline-block relative z-10 ${visual.animClass}`} role="img" aria-label={visual.label}>
        {visual.emoji}
      </span>
    </div>
  )
}

// ─── Smooth Temperature Count-Up ───────────────────────────────────────────

function AnimatedTemp({ target }: { target: number }) {
  const [current, setCurrent] = useState(target)
  const prevRef = useRef(target)

  useEffect(() => {
    const from = prevRef.current
    const to = target
    if (from === to) return

    const duration = 800 // ms
    const startTime = performance.now()

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(2, -10 * progress)
      const val = Math.round(from + (to - from) * ease)
      setCurrent(val)

      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        prevRef.current = to
      }
    }

    requestAnimationFrame(step)
  }, [target])

  return <span>{current}</span>
}

// ─── Shimmer Skeleton Loader ────────────────────────────────────────────────

export function HeroSkeleton() {
  return (
    <div className="glass-card h-full flex flex-col justify-between min-h-[360px]">
      <div>
        <div className="skeleton h-5 w-40 rounded-lg mb-3" />
        <div className="skeleton h-8 w-56 rounded-xl mb-6" />
        <div className="flex items-center justify-between gap-4 my-4">
          <div className="skeleton h-20 w-32 rounded-2xl" />
          <div className="skeleton h-16 w-16 rounded-full" />
        </div>
        <div className="skeleton h-5 w-3/4 rounded-lg mt-3" />
      </div>
      <div className="grid grid-cols-3 gap-2.5 mt-6">
        {[0, 1, 2].map(i => (
          <div key={i} className="skeleton h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

// ─── Stat Pill Component (Skeuomorphic) ────────────────────────────────────

function StatPill({ icon, label, value, hint }: { icon: string; label: string; value: string; hint?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -2 }}
      className="glass p-3 rounded-2xl flex flex-col items-center justify-center text-center border border-white/10 bg-white/5 shadow-md group transition-all"
    >
      <span className="text-xl mb-0.5 group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/50">{label}</span>
      <span className="font-extrabold text-sm text-white font-display mt-0.5">{value}</span>
      {hint && <span className="text-[9px] text-white/40 mt-0.5">{hint}</span>}
    </motion.div>
  )
}

// ─── Main Hero Weather Card ────────────────────────────────────────────────

interface HeroWeatherCardProps {
  locationName: string | null
  currentWeather: {
    temp_c: number
    feels_like_c: number
    humidity_pct: number
    wind_kmh: number
    rain_mm: number
    condition: string
    icon_code: string
  } | null
  isLoading: boolean
  alerts: Alert[]
  unit: UnitSystem
  isStale?: boolean
  onOpenShare?: () => void
  onOpenBulletin?: () => void
}

export default function HeroWeatherCard({
  locationName,
  currentWeather,
  isLoading,
  alerts,
  unit,
  isStale = false,
  onOpenShare,
  onOpenBulletin,
}: HeroWeatherCardProps) {
  if (isLoading || !currentWeather) return <HeroSkeleton />

  const isRain = currentWeather.rain_mm > 0 || currentWeather.condition.toLowerCase().includes('rain')
  const isHighHeat = currentWeather.temp_c >= 38
  const displayTemp = unit === 'imperial' ? Math.round((currentWeather.temp_c * 9) / 5 + 32) : Math.round(currentWeather.temp_c)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="glass-card h-full flex flex-col justify-between min-h-[360px] relative overflow-hidden"
    >
      {/* Top Header & Data Freshness Badge */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-label font-bold text-white/50 tracking-widest">
            Live Meteorology
          </span>

          {/* Data Freshness / Confidence Badge (Requirement 2) */}
          <div className="flex items-center gap-1.5">
            {isStale ? (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-[10px] font-bold text-amber-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Cached · 15m TTL
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live · Verified IMD Grid
              </span>
            )}
          </div>
        </div>

        {/* Location Title & Quick Actions */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <h2 className="font-black text-xl md:text-2xl text-white tracking-tight flex items-center gap-2 font-display truncate">
            <span>📍</span>
            <span className="truncate">{locationName || 'Indian Region'}</span>
          </h2>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onOpenBulletin && (
              <button
                onClick={onOpenBulletin}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-bold text-white transition-all cursor-pointer"
                title="View in IMD 4-Color Bulletin Format"
              >
                🏛️ Bulletin
              </button>
            )}

            {onOpenShare && (
              <button
                onClick={onOpenShare}
                className="px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 text-[11px] font-bold text-indigo-200 transition-all cursor-pointer"
                title="Download / Share WhatsApp Forecast Card"
              >
                📲 Share
              </button>
            )}
          </div>
        </div>

        {/* Temperature & Animated Icon Row */}
        <div className="flex items-center justify-between gap-4 mt-4 mb-2">
          <div className="flex items-baseline gap-1">
            <span className="text-display">
              <AnimatedTemp target={displayTemp} />
            </span>
            <span className="text-3xl sm:text-4xl font-light text-white/60 font-display">
              °{unit === 'imperial' ? 'F' : 'C'}
            </span>
          </div>

          <WeatherIcon iconCode={currentWeather.icon_code} />
        </div>

        {/* Condition Summary */}
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <p className="font-extrabold text-base md:text-lg text-white font-display tracking-tight">
            {currentWeather.condition}
          </p>
          {alerts.length > 0 && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/25 text-red-200 border border-red-400/40 font-bold animate-pulse">
              ⚠️ {alerts.length} Active Alert{alerts.length > 1 ? 's' : ''}
            </span>
          )}
          {isRain && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
              Rainfall Active 💧
            </span>
          )}
          {isHighHeat && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
              High Thermal 🌡️
            </span>
          )}
        </div>

        <p className="text-xs text-white/60 font-medium">
          Feels like <strong className="text-white font-bold">{formatTemp(currentWeather.feels_like_c, unit)}</strong> · Local IMD Grid
        </p>
      </div>

      {/* Skeuomorphic Stat Pills */}
      <div className="grid grid-cols-3 gap-2.5 mt-6 pt-4 border-t border-white/10">
        <StatPill
          icon="💧"
          label="Humidity"
          value={`${currentWeather.humidity_pct}%`}
          hint={currentWeather.humidity_pct > 80 ? 'Humid' : 'Moderate'}
        />
        <StatPill
          icon="💨"
          label="Wind Velocity"
          value={formatWind(currentWeather.wind_kmh, unit)}
          hint={currentWeather.wind_kmh > 30 ? 'Breezy' : 'Calm'}
        />
        <StatPill
          icon="🌧️"
          label="Precipitation"
          value={formatRain(currentWeather.rain_mm, unit)}
          hint="24h Volume"
        />
      </div>
    </motion.div>
  )
}
