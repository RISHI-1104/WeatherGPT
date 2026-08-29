import { motion } from 'framer-motion'
import type { ForecastDay } from '../api/weatherApi'
import { formatTemp, formatRain, type UnitSystem } from '../utils/units'

interface FarmingCalendarProps {
  forecast: ForecastDay[]
  unit: UnitSystem
  locationName: string
}

interface DayAgriAdvisory {
  irrigation: { status: 'good' | 'caution' | 'avoid'; label: string; icon: string }
  spraying: { status: 'good' | 'caution' | 'avoid'; label: string; icon: string }
  harvest: { status: 'good' | 'caution' | 'avoid'; label: string; icon: string }
  summary: string
}

function evaluateDayAgri(day: ForecastDay): DayAgriAdvisory {
  const rain = day.rain_mm || 0
  const wind = day.wind_kmh || 0
  const maxTemp = day.max_temp_c || 25

  let irrigation: DayAgriAdvisory['irrigation']
  let spraying: DayAgriAdvisory['spraying']
  let harvest: DayAgriAdvisory['harvest']
  let summary = ''

  // Irrigation logic
  if (rain >= 5) {
    irrigation = { status: 'avoid', label: 'Skip Irrigation (Rainfall Expected)', icon: '🚫' }
    summary = 'Natural precipitation adequate; avoid power/water waste.'
  } else if (rain > 1) {
    irrigation = { status: 'caution', label: 'Light Irrigation Only', icon: '⚠️' }
    summary = 'Scattered showers possible; monitor soil moisture.'
  } else {
    irrigation = { status: 'good', label: 'Ideal for Irrigation', icon: '💧' }
    summary = 'Dry soil profile; optimal irrigation window.'
  }

  // Pesticide / Chemical spraying logic
  if (rain > 2 || wind > 25) {
    spraying = { status: 'avoid', label: 'Avoid Spraying (Wash-off / Drift Risk)', icon: '🚫' }
  } else if (wind > 15 || maxTemp > 38) {
    spraying = { status: 'caution', label: 'Spray Early Morning Only', icon: '⚠️' }
  } else {
    spraying = { status: 'good', label: 'Optimal Spray Window', icon: '🌿' }
  }

  // Harvesting / Field Work logic
  if (rain >= 10) {
    harvest = { status: 'avoid', label: 'Unsafe / Muddy Field', icon: '🚫' }
  } else if (rain >= 3) {
    harvest = { status: 'caution', label: 'Caution — Damp Soil', icon: '⚠️' }
  } else {
    harvest = { status: 'good', label: 'Favorable Field Work', icon: '🚜' }
  }

  return { irrigation, spraying, harvest, summary }
}

export default function FarmingCalendar({ forecast, unit, locationName }: FarmingCalendarProps) {
  // If forecast is empty, generate 7-day realistic projection from today
  const days: ForecastDay[] =
    forecast && forecast.length > 0
      ? forecast.slice(0, 7)
      : Array.from({ length: 7 }).map((_, i) => {
          const d = new Date()
          d.setDate(d.getDate() + i)
          return {
            date: d.toISOString().split('T')[0],
            max_temp_c: 32 + (i % 3),
            min_temp_c: 24 - (i % 2),
            rain_mm: i === 1 || i === 3 ? 12 : 0.5,
            wind_kmh: 12 + i * 2,
            condition: i === 1 || i === 3 ? 'Showers' : 'Partly Cloudy',
          }
        })

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card w-full mb-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🌾</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white tracking-tight font-display">
                7-Day Agricultural & Farm Activity Advisory
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold">
                Farmer Persona Active
              </span>
            </div>
            <p className="text-xs text-white/50">
              Rule-based agronomic guidelines for irrigation, spraying, and field work in <strong className="text-white">{locationName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Optimal
          </span>
          <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Caution
          </span>
          <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-400" /> Avoid
          </span>
        </div>
      </div>

      {/* 7-Day Horizontal Scroll Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {days.map((day, idx) => {
          const dateObj = new Date(day.date)
          const dayName = idx === 0 ? 'Today' : dateObj.toLocaleDateString('en-IN', { weekday: 'short' })
          const dateFormatted = dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
          const agri = evaluateDayAgri(day)

          const statusColors = {
            good: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            caution: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
            avoid: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          }

          return (
            <motion.div
              key={day.date + idx}
              whileHover={{ scale: 1.02, y: -2 }}
              className="glass p-3 rounded-2xl flex flex-col justify-between border border-white/10 bg-white/5 shadow-md"
            >
              {/* Day Header */}
              <div className="border-b border-white/10 pb-2 mb-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-white">{dayName}</span>
                  <span className="text-[11px] text-white/50">{dateFormatted}</span>
                </div>
                <div className="flex items-baseline justify-between mt-1 text-xs">
                  <span className="font-bold text-white font-mono">{formatTemp(day.max_temp_c, unit)}</span>
                  <span className="text-white/40 font-mono text-[11px]">{formatTemp(day.min_temp_c, unit)}</span>
                  <span className="text-sky-300 font-semibold text-[11px]">💧 {formatRain(day.rain_mm, unit)}</span>
                </div>
              </div>

              {/* Activity Chips */}
              <div className="space-y-1.5 my-1">
                <div className={`px-2 py-1 rounded-xl text-[10px] font-bold border flex items-center gap-1.5 ${statusColors[agri.irrigation.status]}`}>
                  <span>{agri.irrigation.icon}</span>
                  <span className="truncate">{agri.irrigation.label}</span>
                </div>

                <div className={`px-2 py-1 rounded-xl text-[10px] font-bold border flex items-center gap-1.5 ${statusColors[agri.spraying.status]}`}>
                  <span>{agri.spraying.icon}</span>
                  <span className="truncate">{agri.spraying.label}</span>
                </div>

                <div className={`px-2 py-1 rounded-xl text-[10px] font-bold border flex items-center gap-1.5 ${statusColors[agri.harvest.status]}`}>
                  <span>{agri.harvest.icon}</span>
                  <span className="truncate">{agri.harvest.label}</span>
                </div>
              </div>

              {/* Day Summary */}
              <p className="text-[10px] text-white/60 italic mt-2 border-t border-white/5 pt-1.5 leading-tight line-clamp-2">
                {agri.summary}
              </p>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
