import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { HistoryDay } from '../api/weatherApi'
import { convertTemp, convertRain, type UnitSystem } from '../utils/units'

// ─── Shimmer Trend Skeleton ─────────────────────────────────────────────────

export function TrendSkeleton() {
  return (
    <div className="glass-card h-full flex flex-col justify-between min-h-[380px]">
      <div className="flex items-center justify-between mb-4">
        <div className="skeleton h-6 w-48 rounded-lg" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
      <div className="space-y-4">
        <div className="skeleton h-28 w-full rounded-2xl" />
        <div className="skeleton h-24 w-full rounded-2xl" />
      </div>
    </div>
  )
}

// ─── Custom Glass Tooltip ───────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass px-3.5 py-2.5 rounded-xl text-xs border border-white/20 bg-slate-950/90 shadow-2xl backdrop-blur-xl">
      <p className="font-extrabold text-white mb-1.5 border-b border-white/10 pb-1 font-display">
        📅 {label}
      </p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color }} />
            <span className="text-white/70 font-medium">{entry.name}:</span>
          </div>
          <span className="font-extrabold text-white font-mono">
            {entry.value !== undefined ? entry.value.toFixed(1) : '—'}{' '}
            {entry.name.includes('Temp') ? (unit === 'imperial' ? '°F' : '°C') : unit === 'imperial' ? 'in' : 'mm'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Trend Chart Component ──────────────────────────────────────────────────

interface TrendChartProps {
  history: HistoryDay[]
  isLoading: boolean
  locationName: string | null
  unit?: UnitSystem
}

export default function TrendChart({ history, isLoading, locationName, unit = 'metric' }: TrendChartProps) {
  if (isLoading) return <TrendSkeleton />

  const chartData = history.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    'Max Temp': convertTemp(d.max_temp_c, unit),
    'Min Temp': convertTemp(d.min_temp_c, unit),
    Rainfall: convertRain(d.rain_mm, unit),
  }))

  const hasData = chartData.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="glass-card h-full flex flex-col justify-between min-h-[380px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">📈</span>
          <div>
            <h3 className="font-extrabold text-base text-white tracking-tight font-display">
              7-Day Meteorology Trends
            </h3>
            <p className="text-[11px] text-white/50">
              Daily Max/Min Temperatures ({unit === 'imperial' ? '°F' : '°C'}) & Rain ({unit === 'imperial' ? 'in' : 'mm'}) · <strong className="text-white">{locationName || 'India'}</strong>
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/70 text-xs font-semibold">
          7 Days Past
        </span>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center h-56 text-white/40 text-xs">
          <span>📊</span>
          <p className="mt-1">Historical meteorological data loading...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Temperature Area Chart */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-label font-bold text-white/60">
                Thermal Variations (°{unit === 'imperial' ? 'F' : 'C'})
              </span>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="maxTempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb923c" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#fb923c" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="minTempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.55)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.55)' }} />
                <Tooltip content={<CustomTooltip unit={unit} />} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', paddingTop: 4 }} />
                <Area type="monotone" dataKey="Max Temp" stroke="#fb923c" strokeWidth={2.5} fill="url(#maxTempGrad)" dot={{ r: 3, fill: '#fb923c' }} />
                <Area type="monotone" dataKey="Min Temp" stroke="#38bdf8" strokeWidth={2.5} fill="url(#minTempGrad)" dot={{ r: 3, fill: '#38bdf8' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Rainfall Area Chart */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-label font-bold text-white/60">
                Precipitation Accumulation ({unit === 'imperial' ? 'in' : 'mm'})
              </span>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.55)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.55)' }} />
                <Tooltip content={<CustomTooltip unit={unit} />} />
                <Area type="monotone" dataKey="Rainfall" stroke="#818cf8" strokeWidth={2.5} fill="url(#rainGrad)" dot={{ r: 3, fill: '#818cf8' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </motion.div>
  )
}
