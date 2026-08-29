import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Alert } from '../api/weatherApi'

const SEVERITY_CONFIG = {
  moderate: {
    bgClass: 'alert-moderate',
    badgeClass: 'bg-yellow-500/30 text-yellow-300 border-yellow-400/40',
    textColor: '#fef08a',
    iconBg: 'rgba(234, 179, 8, 0.3)',
    label: 'MODERATE ALERT (YELLOW WATCH)',
    accentColor: '#eab308',
  },
  severe: {
    bgClass: 'alert-severe',
    badgeClass: 'bg-orange-500/30 text-orange-200 border-orange-400/40',
    textColor: '#fed7aa',
    iconBg: 'rgba(249, 115, 22, 0.3)',
    label: 'SEVERE ALERT (ORANGE WARNING)',
    accentColor: '#f97316',
  },
  extreme: {
    bgClass: 'alert-extreme',
    badgeClass: 'bg-red-500/30 text-red-200 border-red-400/50',
    textColor: '#fca5a5',
    iconBg: 'rgba(239, 68, 68, 0.35)',
    label: 'EXTREME WARNING (RED ALERT)',
    accentColor: '#ef4444',
  },
}

interface AlertBannerProps {
  alerts: Alert[]
  locationName?: string | null
  stale?: boolean
  onOpenBulletin?: () => void
}

export default function AlertBanner({ alerts, locationName = 'Current Location', stale, onOpenBulletin }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // Reset dismissed state when location or alerts change
  useEffect(() => {
    setDismissed(new Set())
  }, [locationName, alerts.length])

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.type))
  const hasActiveAlerts = visibleAlerts.length > 0

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Stale Cache Notice (if dual upstream fail) */}
      <AnimatePresence>
        {stale && (
          <motion.div
            key="stale-cache-notice"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="glass px-5 py-3.5 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-950/20"
          >
            <span className="text-2xl animate-pulse">📡</span>
            <div className="flex-1">
              <p className="font-bold text-sm text-amber-200">Offline Fallback · Cached Meteorological Data</p>
              <p className="text-xs text-amber-300/70">Upstream feeds temporarily unreachable — serving latest verified cache.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Alerts List */}
      <AnimatePresence mode="popLayout">
        {hasActiveAlerts ? (
          visibleAlerts.map(alert => {
            const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.moderate
            return (
              <motion.div
                key={alert.type}
                initial={{ opacity: 0, y: -16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, height: 0, marginBottom: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className={`glass ${config.bgClass} px-5 py-4 rounded-2xl flex items-start gap-4 overflow-hidden relative group`}
              >
                {/* Visual Severity Icon with Pulse */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl shadow-inner border border-white/20"
                  style={{ background: config.iconBg }}
                >
                  <span className="animate-bounce" style={{ animationDuration: '2s' }}>
                    {alert.icon}
                  </span>
                </div>

                {/* Alert Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${config.badgeClass} tracking-wider`}>
                      {config.label}
                    </span>
                    <span className="font-extrabold text-sm text-white tracking-wide">
                      {alert.label} — {locationName}
                    </span>
                  </div>

                  <p className="text-xs text-white/90 leading-relaxed font-medium mt-1">
                    {alert.message}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs font-semibold">
                    <span className="px-2.5 py-1 rounded-lg bg-black/30 border border-white/10 text-white/90">
                      Observed: <strong style={{ color: config.textColor }}>{alert.value} {alert.unit}</strong>
                    </span>
                    <span className="text-white/50 text-[11px]">
                      IMD Threshold: {alert.threshold} {alert.unit}
                    </span>

                    {onOpenBulletin && (
                      <button
                        onClick={onOpenBulletin}
                        className="ml-auto text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold border border-white/15 transition-all cursor-pointer"
                      >
                        🏛️ Open IMD Bulletin
                      </button>
                    )}
                  </div>
                </div>

                {/* Dismiss Button */}
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.2)' }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setDismissed(prev => new Set([...prev, alert.type]))}
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white bg-black/20 border border-white/10 transition-all text-xs cursor-pointer"
                  title="Dismiss alert"
                  aria-label="Dismiss alert"
                >
                  ✕
                </motion.button>
              </motion.div>
            )
          })
        ) : (
          /* NO ACTIVE ALERTS STATE */
          <motion.div
            key="all-clear-banner"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="glass alert-all-clear px-5 py-3.5 rounded-2xl flex items-center justify-between gap-4 border border-emerald-500/30"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-lg flex-shrink-0">
                🛡️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="font-bold text-sm text-emerald-200">
                    All Clear · No Active Alerts (GREEN STAGE)
                  </p>
                  <span className="text-xs text-emerald-400/80 font-medium">({locationName})</span>
                </div>
                <p className="text-xs text-emerald-300/70 mt-0.5">
                  Rainfall, wind velocity, and thermal indices are within normal IMD safety limits.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenBulletin && (
                <button
                  onClick={onOpenBulletin}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 text-xs font-bold transition-all cursor-pointer"
                >
                  🏛️ View IMD Bulletin
                </button>
              )}
              <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-300/80">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/20">
                  IMD Monitored 🟢
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
