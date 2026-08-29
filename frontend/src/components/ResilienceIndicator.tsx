import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getHealth, type HealthStatus } from '../api/weatherApi'
import type { ChatResponse } from '../api/weatherApi'

interface ResilienceIndicatorProps {
  lastSource: ChatResponse['source_used'] | null
  compact?: boolean
}

type DotColor = 'green' | 'yellow' | 'red' | 'gray'

function StatusDot({ color, pulse = true }: { color: DotColor; pulse?: boolean }) {
  const colorMap: Record<DotColor, { bg: string; shadow: string; border: string }> = {
    green: { bg: '#10b981', shadow: 'rgba(16, 185, 129, 0.6)', border: '#34d399' },
    yellow: { bg: '#f59e0b', shadow: 'rgba(245, 158, 11, 0.6)', border: '#fbbf24' },
    red: { bg: '#ef4444', shadow: 'rgba(239, 68, 68, 0.6)', border: '#f87171' },
    gray: { bg: 'rgba(255,255,255,0.3)', shadow: 'transparent', border: 'transparent' },
  }

  const { bg, shadow, border } = colorMap[color]

  return (
    <span className="relative flex items-center justify-center flex-shrink-0 w-2.5 h-2.5">
      {pulse && color !== 'gray' && (
        <span
          className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping"
          style={{ backgroundColor: bg }}
        />
      )}
      <span
        className="relative inline-flex w-2 h-2 rounded-full border"
        style={{
          backgroundColor: bg,
          borderColor: border,
          boxShadow: `0 0 8px ${shadow}`,
        }}
      />
    </span>
  )
}

export default function ResilienceIndicator({ lastSource, compact = false }: ResilienceIndicatorProps) {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await getHealth()
        setHealth(data)
      } catch {
        // Backend warming up
      }
    }
    fetchHealth()
    const interval = setInterval(fetchHealth, 10000) // Poll health every 10s
    return () => clearInterval(interval)
  }, [])

  // Resolve active telemetry
  const llmProvider = (lastSource?.llm || health?.llm.active_provider || 'gemini').toLowerCase()
  const llmModel = lastSource?.llm_model || health?.llm.last_model || (llmProvider === 'groq' ? 'qwen3.8-27b' : 'gemini-3.6-flash')
  const weatherSource = (lastSource?.weather || health?.weather.active_source || 'open-meteo').toLowerCase()
  const isFallback = lastSource?.fallback_triggered || (health?.llm.fallback_count ?? 0) > 0

  const isGemini = llmProvider.includes('gemini')
  const isGroq = llmProvider.includes('groq')
  const llmLabel = isGemini ? 'Gemini' : isGroq ? 'Groq' : 'AI Live'
  const weatherLabel = weatherSource.includes('openweathermap') ? 'OWM' : weatherSource.includes('stale') ? 'Cache' : 'Open-Meteo'

  const llmColor: DotColor = isGemini ? 'green' : isGroq ? 'yellow' : 'green'
  const weatherColor: DotColor = weatherSource.includes('stale') ? 'red' : 'green'

  const latency = lastSource ? (health?.llm.last_latency_ms || null) : null

  return (
    <div className="relative inline-block select-none">
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setExpanded(e => !e)}
        className="glass px-3.5 py-1.5 flex items-center gap-2 rounded-xl text-xs font-semibold cursor-pointer border border-white/20 hover:border-white/40 transition-all shadow-md bg-white/10"
        title="Click to inspect Live System Resilience Telemetry"
      >
        {/* LLM Status */}
        <div className="flex items-center gap-1.5">
          <StatusDot color={llmColor} />
          <span className="text-white font-bold">{llmLabel}</span>
          <span className="text-[10px] text-emerald-400 font-medium">● Live</span>
        </div>

        <span className="text-white/30">|</span>

        {/* Weather Source */}
        <div className="flex items-center gap-1.5">
          <StatusDot color={weatherColor} />
          <span className="text-white/80 font-medium">{weatherLabel}</span>
        </div>

        {isFallback && (
          <span className="px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/40">
            ⚡ Fallback Active
          </span>
        )}

        {latency && (
          <span className="hidden sm:inline text-[10px] text-white/50 bg-black/30 px-1.5 py-0.5 rounded-md">
            {latency}ms
          </span>
        )}
      </motion.button>

      {/* Detailed Resilience Popover */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: compact ? 8 : -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: compact ? 8 : -8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`glass absolute ${compact ? 'top-full mt-2' : 'bottom-full mb-2'} right-0 p-4 rounded-2xl text-xs w-72 z-50 shadow-2xl border border-white/25 bg-slate-950/90 backdrop-blur-2xl`}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
              <p className="text-label font-extrabold text-white">System Resilience</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                Healthy 🟢
              </span>
            </div>

            {/* LLM Telemetry */}
            <div className="mb-3.5 bg-white/5 p-2.5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <StatusDot color={llmColor} />
                  <span className="font-bold text-white">LLM Provider</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">{llmLabel}</span>
              </div>
              <div className="space-y-1 pl-4 text-[11px] text-white/70">
                <p>Model: <strong className="text-white font-mono">{llmModel}</strong></p>
                <p>Status: <span className="text-emerald-400 font-semibold">{isFallback ? 'Groq Fallback' : 'Primary Gemini'}</span></p>
                {health?.llm && (
                  <p>Total Q&A: {health.llm.total_calls} · Fallbacks: {health.llm.fallback_count}</p>
                )}
              </div>
            </div>

            {/* Weather Source Telemetry */}
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <StatusDot color={weatherColor} />
                  <span className="font-bold text-white">Weather Feed</span>
                </div>
                <span className="text-xs font-mono font-bold text-sky-400">{weatherLabel}</span>
              </div>
              <div className="space-y-1 pl-4 text-[11px] text-white/70">
                <p>Primary: <span className="text-white">Open-Meteo (Keyless 15m Cache)</span></p>
                <p>Secondary: <span className="text-white">OpenWeatherMap (Fallback)</span></p>
                {health?.weather && (
                  <p>Cache Hit Rate: <strong className="text-white">{(health.weather.cache_hit_rate * 100).toFixed(0)}%</strong> ({health.weather.cache_hits}/{health.weather.cache_total})</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
