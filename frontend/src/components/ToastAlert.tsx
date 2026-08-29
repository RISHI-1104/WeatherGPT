import { motion, AnimatePresence } from 'framer-motion'
import type { Alert } from '../api/weatherApi'

interface ToastAlertProps {
  alerts: Alert[]
  locationName: string
  onDismiss: (type: string) => void
  dismissedToasts: Set<string>
}

export default function ToastAlert({ alerts, locationName, onDismiss, dismissedToasts }: ToastAlertProps) {
  const activeToasts = alerts.filter(a => !dismissedToasts.has(a.type))

  if (activeToasts.length === 0) return null

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {activeToasts.map(alert => {
          const isExtreme = alert.severity === 'extreme'
          const isSevere = alert.severity === 'severe'
          const bgStyle = isExtreme
            ? 'bg-red-950/90 border-red-500/60 shadow-red-500/20'
            : isSevere
            ? 'bg-amber-950/90 border-amber-500/60 shadow-amber-500/20'
            : 'bg-yellow-950/90 border-yellow-500/60 shadow-yellow-500/20'

          return (
            <motion.div
              key={alert.type}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`pointer-events-auto p-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-start gap-3 text-white ${bgStyle}`}
            >
              <span className="text-2xl flex-shrink-0 animate-bounce">{alert.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/20">
                    {alert.severity.toUpperCase()} EARLY WARNING
                  </span>
                  <button
                    onClick={() => onDismiss(alert.type)}
                    className="text-white/60 hover:text-white text-xs cursor-pointer p-0.5"
                    title="Dismiss alert"
                  >
                    ✕
                  </button>
                </div>
                <p className="font-bold text-xs mt-1 truncate">
                  {alert.label} — {locationName}
                </p>
                <p className="text-[11px] text-white/80 line-clamp-2 mt-0.5 leading-snug">
                  {alert.message}
                </p>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
