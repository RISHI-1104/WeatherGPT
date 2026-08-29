import { motion, AnimatePresence } from 'framer-motion'
import type { Alert } from '../api/weatherApi'
import { formatTemp, formatWind, formatRain, type UnitSystem } from '../utils/units'

interface IMDBulletinModalProps {
  isOpen: boolean
  onClose: () => void
  locationName: string
  currentWeather: any
  alerts: Alert[]
  unit: UnitSystem
}

export default function IMDBulletinModal({
  isOpen,
  onClose,
  locationName,
  currentWeather,
  alerts,
  unit,
}: IMDBulletinModalProps) {
  if (!isOpen) return null

  // Determine highest severity color level
  let highestSeverity = 'green'
  if (alerts.some(a => a.severity === 'extreme')) highestSeverity = 'red'
  else if (alerts.some(a => a.severity === 'severe')) highestSeverity = 'orange'
  else if (alerts.some(a => a.severity === 'moderate')) highestSeverity = 'yellow'

  const stages = [
    {
      code: 'green',
      name: 'GREEN (NO WARNING)',
      action: 'No action required · Be in touch with regular forecasts',
      bg: 'bg-emerald-900/30 border-emerald-500/40 text-emerald-300',
      badge: 'bg-emerald-500 text-slate-950',
      active: highestSeverity === 'green',
    },
    {
      code: 'yellow',
      name: 'YELLOW (WATCH)',
      action: 'Be updated · Keep track of localized weather variations',
      bg: 'bg-yellow-900/30 border-yellow-500/40 text-yellow-300',
      badge: 'bg-yellow-500 text-slate-950',
      active: highestSeverity === 'yellow',
    },
    {
      code: 'orange',
      name: 'ORANGE (ALERT)',
      action: 'Be prepared · Significant weather hazards likely; prepare essential backups',
      bg: 'bg-orange-900/30 border-orange-500/40 text-orange-300',
      badge: 'bg-orange-500 text-slate-950',
      active: highestSeverity === 'orange',
    },
    {
      code: 'red',
      name: 'RED (WARNING)',
      action: 'Take action · Severe meteorological disaster risk; follow emergency guidelines',
      bg: 'bg-red-900/30 border-red-500/40 text-red-300',
      badge: 'bg-red-500 text-white',
      active: highestSeverity === 'red',
    },
  ]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="glass-card max-w-2xl w-full p-6 bg-slate-950/95 border border-white/25 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scroll"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏛️</span>
                <h3 className="font-black text-lg text-white font-display uppercase tracking-tight">
                  IMD-Style Meteorological Bulletin
                </h3>
              </div>
              <p className="text-xs text-emerald-400 font-bold mt-0.5">
                Standard 4-Color Warning Framework (Presentation of Local Threshold Engine)
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-sm font-bold cursor-pointer p-1"
            >
              ✕
            </button>
          </div>

          {/* Bulletin Metadata Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 text-xs mb-4">
            <div>
              <p className="text-white/40 uppercase text-[9px] font-bold">Target Region</p>
              <p className="text-white font-bold">{locationName}</p>
            </div>
            <div>
              <p className="text-white/40 uppercase text-[9px] font-bold">Wind Velocity</p>
              <p className="text-white font-bold">{formatWind(currentWeather?.wind_kmh ?? 10, unit)}</p>
            </div>
            <div>
              <p className="text-white/40 uppercase text-[9px] font-bold">Thermal Grid</p>
              <p className="text-white font-bold">{formatTemp(currentWeather?.temp_c ?? 30, unit)}</p>
            </div>
            <div>
              <p className="text-white/40 uppercase text-[9px] font-bold">24h Precipitation</p>
              <p className="text-white font-bold">{formatRain(currentWeather?.rain_mm ?? 0, unit)}</p>
            </div>
          </div>

          {/* 4-Stage Color Framework Matrix */}
          <div className="space-y-2.5 mb-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-white/60">
              IMD Color Code Warning Assessment:
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {stages.map(st => (
                <div
                  key={st.code}
                  className={`p-3 rounded-xl border transition-all ${st.bg} ${
                    st.active ? 'ring-2 ring-white shadow-lg' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${st.badge}`}>
                      {st.name}
                    </span>
                    {st.active && (
                      <span className="text-[10px] font-extrabold text-white bg-white/20 px-2 py-0.5 rounded-full animate-pulse">
                        CURRENT LEVEL
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold leading-snug">{st.action}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Specific Active Alerts in Bulletin format */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 mb-4">
            <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
              <span>⚠️</span> Specific Warning Directives:
            </h4>
            {alerts.length > 0 ? (
              <div className="space-y-2">
                {alerts.map(a => (
                  <div key={a.type} className="text-xs text-white/90 border-l-2 border-amber-400 pl-3 py-1">
                    <p className="font-bold text-amber-300">
                      {a.icon} {a.label} (Observed: {a.value} {a.unit})
                    </p>
                    <p className="text-white/70 text-[11px] mt-0.5">{a.message}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">Threshold benchmark: {a.threshold} {a.unit}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-300">
                ✅ No threshold violations detected. All meteorological parameters are within normal IMD limits.
              </p>
            )}
          </div>

          {/* Disclaimer Note */}
          <p className="text-[10px] text-white/40 italic text-center">
            * This bulletin format is generated algorithmically by WeatherGPT's threshold rule engine modeled after IMD classifications.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
