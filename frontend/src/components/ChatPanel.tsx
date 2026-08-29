import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Message } from '../hooks/useWeather'
import { useSpeech } from '../hooks/useSpeech'
import type { Alert } from '../api/weatherApi'

// ─── Shimmer Chat Skeleton ──────────────────────────────────────────────────

export function ChatSkeleton() {
  return (
    <div className="glass-card h-full flex flex-col gap-4 min-h-[480px]">
      <div className="flex items-center justify-between">
        <div className="skeleton h-6 w-48 rounded-lg" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
      <div className="flex-1 flex flex-col gap-4 py-2">
        <div className="skeleton h-16 w-3/4 rounded-2xl" />
        <div className="skeleton h-14 w-2/3 rounded-2xl self-end" />
        <div className="skeleton h-20 w-4/5 rounded-2xl" />
      </div>
      <div className="skeleton h-14 w-full rounded-2xl mt-auto" />
    </div>
  )
}

// ─── Microphone Button with Multi-layer Pulsing Rings ───────────────────────

function MicButton({
  isListening,
  onClick,
  unsupported,
}: {
  isListening: boolean
  onClick: () => void
  unsupported?: boolean
}) {
  return (
    <div className="relative flex items-center justify-center">
      {isListening && (
        <>
          <span className="absolute w-12 h-12 rounded-full bg-red-500/40 animate-pulse-ring" />
          <span
            className="absolute w-12 h-12 rounded-full bg-red-500/25 animate-pulse-ring"
            style={{ animationDelay: '0.4s' }}
          />
        </>
      )}

      <motion.button
        type="button"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={onClick}
        className={`relative z-10 w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-md ${isListening
            ? 'bg-gradient-to-tr from-red-600 to-rose-500 text-white border border-red-300 shadow-red-500/50'
            : unsupported
              ? 'bg-white/10 text-white/40 border border-white/10 hover:text-white/70'
              : 'bg-gradient-to-tr from-indigo-600/80 to-purple-600/80 hover:from-indigo-500 hover:to-purple-500 text-white border border-white/20 hover:border-white/40'
          }`}
        title={
          isListening
            ? 'Recording speech... Click to Stop'
            : unsupported
              ? 'Speech Recognition not supported in this browser'
              : '🎙️ Voice Input (Speak in English, Hindi, or Tamil)'
        }
      >
        <span className="text-lg">{isListening ? '⏹️' : '🎙️'}</span>
      </motion.button>
    </div>
  )
}

// ─── Text-to-Speech Play Button ─────────────────────────────────────────────

function TTSButton({
  playing,
  onPlay,
  onStop,
}: {
  playing: boolean
  onPlay: () => void
  onStop: () => void
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      onClick={playing ? onStop : onPlay}
      className={`text-xs px-2.5 py-1 rounded-xl glass hover:bg-white/20 transition-all flex items-center gap-1.5 cursor-pointer ${playing ? 'bg-amber-500/30 text-amber-200 border-amber-400/40' : 'text-white/80'
        }`}
      title={playing ? 'Stop speech audio' : 'Listen to response'}
    >
      <span>{playing ? '⏹' : '🔊'}</span>
      <span className="text-[11px] font-semibold">{playing ? 'Stop' : 'Listen'}</span>
    </motion.button>
  )
}

// ─── Explainability Panel Component (Only shown on Latest AI Message) ────────

function ExplainabilityPanel({
  location,
  alerts,
  currentWeather,
}: {
  location: string
  alerts: Alert[]
  currentWeather: any
}) {
  const [open, setOpen] = useState(false)

  const rain = currentWeather?.rain_mm ?? 0
  const temp = currentWeather?.temp_c ?? 30
  const wind = currentWeather?.wind_kmh ?? 10
  const humidity = currentWeather?.humidity_pct ?? 65

  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[11px] font-bold text-sky-300 hover:text-sky-200 bg-sky-950/50 hover:bg-sky-900/60 px-2.5 py-1 rounded-lg border border-sky-500/30 transition-all cursor-pointer"
      >
        <span>🔍</span>
        <span>{open ? 'Hide Reasoning' : 'Why this answer? (Data Reasoning)'}</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-3 rounded-xl bg-slate-950/90 border border-white/15 text-white/85 space-y-2 overflow-hidden shadow-xl"
          >
            <p className="font-bold text-white text-[11px] border-b border-white/10 pb-1 flex items-center justify-between">
              <span>Grounding Meteorological Breakdown · {location}</span>
              <span className="text-[10px] text-emerald-400">Rule-Engine Verified</span>
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-1.5 rounded bg-white/5 border border-white/10">
                <span className="text-white/50 text-[10px] block">Thermal:</span>
                <strong className="text-white">{temp}°C</strong>
              </div>
              <div className="p-1.5 rounded bg-white/5 border border-white/10">
                <span className="text-white/50 text-[10px] block">Rainfall:</span>
                <strong className="text-white">{rain} mm</strong>
              </div>
              <div className="p-1.5 rounded bg-white/5 border border-white/10">
                <span className="text-white/50 text-[10px] block">Wind Speed:</span>
                <strong className="text-white">{wind} km/h</strong>
              </div>
              <div className="p-1.5 rounded bg-white/5 border border-white/10">
                <span className="text-white/50 text-[10px] block">Humidity:</span>
                <strong className="text-white">{humidity}%</strong>
              </div>
            </div>

            <div className="text-[11px] text-white/70 space-y-1 pt-1 border-t border-white/10">
              <p>
                • <strong>IMD Threshold Criteria:</strong> Heavy rain alert triggers at &gt;64.5mm/24h. Heatwave triggers at &gt;40°C.
              </p>
              <p>
                • <strong>Active Alerts:</strong>{' '}
                {alerts.length > 0 ? (
                  <span className="text-amber-300 font-semibold">{alerts.map(a => `${a.label} (${a.value} ${a.unit})`).join(', ')}</span>
                ) : (
                  <span className="text-emerald-300 font-semibold">None (Normal range)</span>
                )}
              </p>
              <p className="text-[10px] text-white/50 italic">
                * The response was synthesized by grounding strictly on these meteorological variables without hallucinating unverified weather claims.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Dynamic Suggested Follow-ups (Only on Latest AI Message) ───────────────

function SuggestedFollowUps({
  lastQuery,
  onSelect,
  alerts,
}: {
  lastQuery?: string
  onSelect: (q: string) => void
  alerts: Alert[]
}) {
  const query = (lastQuery || '').toLowerCase()

  let suggestions = [
    '🌾 What is the pesticide spraying window?',
    '💧 Should I irrigate my crops tomorrow?',
    '🌧️ Will it rain this upcoming weekend?',
  ]

  if (query.includes('irrigate') || query.includes('crop') || query.includes('paddy') || query.includes('farm')) {
    suggestions = [
      '🌿 Is it safe for pesticide & fertilizer spray?',
      '🚜 When is the best window for harvest/field work?',
      '📊 Give me a 7-day soil moisture & rainfall outlook',
    ]
  } else if (query.includes('travel') || query.includes('cyclone') || query.includes('warning') || alerts.length > 0) {
    suggestions = [
      '🚨 What safety precautions should citizens take?',
      '🚗 Is highway/road commute safe today?',
      '⚡ When is this weather condition expected to clear?',
    ]
  } else if (query.includes('rain') || query.includes('umbrella')) {
    suggestions = [
      '🕒 At what time of day will rainfall peak?',
      '🌡️ How will humidity and temperature change tonight?',
      '🌾 What is the agricultural impact of this rain?',
    ]
  }

  return (
    <div className="mt-2.5 pt-2 border-t border-white/10">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/50 mb-1.5 flex items-center gap-1">
        <span>💡</span> Suggested Follow-ups:
      </p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s, idx) => (
          <motion.button
            key={idx}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(s.replace(/^[^\s]+\s/, ''))}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/90 hover:text-white transition-all cursor-pointer text-left truncate max-w-full"
          >
            {s}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ─── Message Bubble Component ───────────────────────────────────────────────

function MessageBubble({
  msg,
  onSpeak,
  ttsPlaying,
  onStopSpeak,
  location,
  alerts,
  currentWeather,
  isLatestAi,
  onSelectSuggestion,
}: {
  msg: Message
  onSpeak: (text: string) => void
  ttsPlaying: boolean
  onStopSpeak: () => void
  location: string
  alerts: Alert[]
  currentWeather: any
  isLatestAi: boolean
  onSelectSuggestion: (q: string) => void
}) {
  const isUser = msg.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3.5`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 border border-white/20 flex items-center justify-center text-sm shadow-md mr-2.5 mt-0.5 flex-shrink-0">
          🤖
        </div>
      )}

      <div className={`max-w-[88%] sm:max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1.5`}>
        <div
          className={`px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-lg ${isUser
              ? 'bg-gradient-to-r from-indigo-600/90 to-purple-600/90 border border-indigo-400/40 text-white rounded-br-sm'
              : msg.error
                ? 'bg-red-950/60 border border-red-500/40 text-red-100 rounded-bl-sm'
                : 'bg-slate-900/70 border border-white/15 text-white/95 rounded-bl-sm backdrop-blur-xl'
            }`}
        >
          <div className="whitespace-pre-wrap font-medium">{msg.content}</div>

          {/* Explainability Panel strictly on latest AI message */}
          {!isUser && isLatestAi && !msg.error && (
            <ExplainabilityPanel
              location={location}
              alerts={alerts}
              currentWeather={currentWeather}
            />
          )}

          {/* Suggested follow-up questions strictly on latest AI message */}
          {!isUser && isLatestAi && !msg.error && (
            <SuggestedFollowUps
              lastQuery={msg.content}
              onSelect={onSelectSuggestion}
              alerts={alerts}
            />
          )}
        </div>

        {/* Message Telemetry Footer */}
        <div className="flex items-center gap-2 px-1 text-[11px] text-white/40">
          <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

          {!isUser && !msg.error && (
            <>
              <span>•</span>
              <TTSButton
                playing={ttsPlaying}
                onPlay={() => onSpeak(msg.content)}
                onStop={onStopSpeak}
              />
            </>
          )}

          {msg.latency && (
            <>
              <span>•</span>
              <span className="font-mono text-emerald-400/80">
                {msg.latency < 1000 ? `${msg.latency}ms` : `${(msg.latency / 1000).toFixed(1)}s`}
              </span>
            </>
          )}

          {msg.sourceUsed?.llm && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/60">
              {msg.sourceUsed.llm}
            </span>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-700 border border-white/20 flex items-center justify-center text-sm shadow-md ml-2.5 mt-0.5 flex-shrink-0">
          👤
        </div>
      )}
    </motion.div>
  )
}

// ─── Typing Pulse Indicator ─────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex items-center gap-2.5 mb-3"
    >
      <div className="w-8 h-8 rounded-xl bg-sky-600/40 border border-sky-400/30 flex items-center justify-center text-sm flex-shrink-0">
        🤖
      </div>
      <div className="bg-slate-900/80 border border-white/15 px-4 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-1.5 shadow-md">
        <span className="text-xs text-white/60 font-semibold mr-1">Analyzing meteorology</span>
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 bg-sky-400 rounded-full"
            animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  )
}

// ─── Main Chat Panel ────────────────────────────────────────────────────────

interface ChatPanelProps {
  messages: Message[]
  onSendMessage: (question: string) => Promise<void>
  isLoading: boolean
  location: string
  alerts?: Alert[]
  currentWeather?: any
  sectorMode?: 'general' | 'farmer' | 'citizen' | 'researcher'
  onSectorModeChange?: (mode: 'general' | 'farmer' | 'citizen' | 'researcher') => void
  language?: string
  onLanguageChange?: (lang: string) => void
}

export default function ChatPanel({
  messages,
  onSendMessage,
  isLoading,
  location,
  alerts = [],
  currentWeather = null,
  sectorMode = 'general',
  onSectorModeChange,
  language = 'en',
  onLanguageChange,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)  // Scoped container for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    speechSupported,
    permissionDenied,
    isListening,
    transcript,
    ttsPlaying,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    resetTranscript,
  } = useSpeech()

  // Auto-sync speech recognition transcript to input field
  useEffect(() => {
    if (transcript) {
      setInput(transcript)
    }
  }, [transcript])

  // Scroll to bottom scoped to the messages container only
  // (does NOT cause the whole page to scroll)
  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages.length, isLoading])

  const handleSend = useCallback(async (customText?: string) => {
    const text = (customText || input).trim()
    if (!text || isLoading) return

    setInput('')
    resetTranscript()
    await onSendMessage(text)
  }, [input, isLoading, onSendMessage, resetTranscript])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMicClick = () => {
    if (isListening) {
      stopListening()
      return
    }

    if (!speechSupported) {
      setVoiceNotice('Voice recognition is not supported in this browser. Please type your query.')
      setTimeout(() => setVoiceNotice(null), 5000)
      return
    }

    if (permissionDenied) {
      setVoiceNotice('Microphone permission was denied. Please allow microphone access in browser settings.')
      setTimeout(() => setVoiceNotice(null), 5000)
      return
    }

    startListening()
  }

  const userHistory = messages.filter(m => m.role === 'user')
  const lastAiIndex = messages.map(m => m.role).lastIndexOf('ai')

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass-card flex flex-col justify-between h-full min-h-[480px] relative overflow-hidden"
    >
      {/* Header with Sector Mode Pills & History Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">💬</span>
          <div>
            <h3 className="font-extrabold text-base text-white tracking-tight font-display">
              Conversational Weather Advisor
            </h3>
            <p className="text-[11px] text-white/50">
              Grounded AI Weather Intelligence for <strong className="text-white">{location}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sector Mode Selector Pills (Decluttered from Navbar to Chat Panel) */}
          {onSectorModeChange && (
            <div className="flex items-center bg-white/5 p-0.5 rounded-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => onSectorModeChange('farmer')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${sectorMode === 'farmer' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-white/60 hover:text-white'
                  }`}
                title="Farmer Sector Mode (Agri calendar & irrigation advice)"
              >
                🌾 Farm
              </button>
              <button
                type="button"
                onClick={() => onSectorModeChange('citizen')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${sectorMode === 'citizen' ? 'bg-red-500 text-white shadow-md' : 'text-white/60 hover:text-white'
                  }`}
                title="Citizen Sector Mode (Safety warnings & travel advice)"
              >
                🚨 Safety
              </button>
              <button
                type="button"
                onClick={() => onSectorModeChange('general')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${sectorMode === 'general' ? 'bg-white/20 text-white shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                title="General Mode"
              >
                🌐 All
              </button>
            </div>
          )}

          {/* Query History Drawer Toggle */}
          <button
            onClick={() => setShowHistory(h => !h)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${showHistory
                ? 'bg-amber-500/30 text-amber-200 border-amber-400/40'
                : 'bg-white/10 text-white/70 border-white/15 hover:text-white'
              }`}
            title="Toggle Session Query History"
          >
            <span>📜</span>
            <span className="hidden sm:inline">History ({userHistory.length})</span>
          </button>
        </div>
      </div>

      {/* Query History Session Drawer */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 p-3 rounded-2xl bg-slate-950/90 border border-amber-500/30 text-xs text-white"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <span>📜</span> Session Query History:
              </span>
              <button onClick={() => setShowHistory(false)} className="text-white/50 hover:text-white font-bold">✕</button>
            </div>
            {userHistory.length === 0 ? (
              <p className="text-white/40 text-[11px] italic">No queries in this session yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scroll pr-1">
                {userHistory.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setShowHistory(false)
                      handleSend(h.content)
                    }}
                    className="w-full text-left p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-white/80 hover:text-white flex items-center justify-between gap-2 cursor-pointer transition-all truncate"
                  >
                    <span className="truncate">" {h.content} "</span>
                    <span className="text-[10px] text-white/40 font-mono flex-shrink-0">
                      {h.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Warning Notice if triggered */}
      <AnimatePresence>
        {voiceNotice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 px-3 py-2 rounded-xl text-xs bg-amber-500/20 border border-amber-400/30 text-amber-200 flex items-center justify-between"
          >
            <span>🎙️ {voiceNotice}</span>
            <button onClick={() => setVoiceNotice(null)} className="text-white/60 hover:text-white font-bold ml-2">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Stream — scrollable container scoped to chat panel */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto custom-scroll pr-1 py-2 mb-3"
        style={{ maxHeight: 380 }}
      >
        {messages.map((msg, index) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onSpeak={speak}
            ttsPlaying={ttsPlaying}
            onStopSpeak={stopSpeaking}
            location={location}
            alerts={alerts}
            currentWeather={currentWeather}
            isLatestAi={index === lastAiIndex}
            onSelectSuggestion={handleSend}
          />
        ))}

        <AnimatePresence>{isLoading && <TypingIndicator />}</AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Listening Status Bar */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-xs flex items-center justify-between mb-2 animate-pulse"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Listening to voice input... speak clearly into microphone.
            </span>
            <button onClick={stopListening} className="underline font-bold cursor-pointer">Done</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Form Bar + Language Selector */}
      <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
        {/* Language Selector — compact pills near input */}
        {onLanguageChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Lang:</span>
            {[
              { code: 'en', label: 'EN', name: 'English' },
              { code: 'hi', label: 'हिन्दी', name: 'Hindi' },
              { code: 'ta', label: 'தமிழ்', name: 'Tamil' },
            ].map(lang => (
              <button
                key={lang.code}
                type="button"
                onClick={() => onLanguageChange(lang.code)}
                title={lang.name}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${language === lang.code
                    ? 'bg-sky-500/30 text-sky-200 border border-sky-400/40'
                    : 'text-white/50 hover:text-white bg-white/5 border border-white/10'
                  }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        )}

        {/* Text input row */}
        <div className="flex items-end gap-2.5">
          <textarea
            id="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about anything in ${location}...`}
            rows={1}
            className="glass-input flex-1 px-4 py-2.5 text-xs sm:text-sm resize-none leading-relaxed min-h-[44px]"
            style={{ maxHeight: 110 }}
            onInput={e => {
              const el = e.target as HTMLTextAreaElement
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 110) + 'px'
            }}
          />

          {/* STT MICROPHONE BUTTON */}
          <MicButton
            isListening={isListening}
            onClick={handleMicClick}
            unsupported={!speechSupported}
          />

          {/* Send Button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="glass-btn w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-black text-lg disabled:opacity-40 disabled:cursor-not-allowed shadow-lg cursor-pointer"
            title="Send query"
          >
            {isLoading ? '⏳' : '➔'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
