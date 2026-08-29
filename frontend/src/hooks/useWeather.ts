import { useState, useEffect, useCallback } from 'react'
import {
  getAlerts,
  getHistory,
  sendChat,
  type Alert,
  type ChatResponse,
  type ForecastDay,
  type HistoryDay,
  type LocationInfo,
} from '../api/weatherApi'

export interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: Date
  sourceUsed?: ChatResponse['source_used']
  latency?: number | null
  error?: boolean
}

interface UseWeatherReturn {
  location: string
  setLocation: (loc: string) => void
  resolvedLocation: LocationInfo | null
  currentWeather: any
  forecast: ForecastDay[]
  alerts: Alert[]
  history: HistoryDay[]
  messages: Message[]
  isLoading: boolean
  isChatLoading: boolean
  isHistoryLoading: boolean
  language: string
  setLanguage: (lang: string) => void
  sendMessage: (question: string) => Promise<void>
  fetchWeatherForLocation: (loc: string) => Promise<void>
  lastSource: ChatResponse['source_used'] | null
}

export function useWeather(): UseWeatherReturn {
  const [location, setLocation] = useState<string>('')  // No persistence — popup always shown
  const [resolvedLocation, setResolvedLocation] = useState<LocationInfo | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [history, setHistory] = useState<HistoryDay[]>([])
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'ai',
      content: "🌤️ Hello! I'm WeatherGPT — your AI weather assistant for India. Ask me anything about weather, farming, or safety conditions. You can also try the **Demo Scenarios** below!",
      timestamp: new Date(),
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [language, setLanguage] = useState('en')
  const [lastSource, setLastSource] = useState<ChatResponse['source_used'] | null>(null)

  const fetchWeatherForLocation = useCallback(async (loc: string) => {
    setIsLoading(true)
    try {
      const [alertsData, histData] = await Promise.allSettled([
        getAlerts(loc),
        getHistory(loc, 7),
      ])

      if (alertsData.status === 'fulfilled') {
        const d = alertsData.value
        setAlerts(d.alerts)
        setResolvedLocation(d.location)
        // extract weather from alerts response (location resolved)
      }
      if (histData.status === 'fulfilled') {
        setHistory(histData.value.history)
        setResolvedLocation(histData.value.location)
      }
    } catch (err) {
      console.error('Weather fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim()) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsChatLoading(true)

    try {
      const resp = await sendChat(question, location, language)

      if (resp.location_resolved) setResolvedLocation(resp.location_resolved)
      if (resp.alerts?.length) setAlerts(resp.alerts)
      if (resp.source_used) setLastSource(resp.source_used)

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: resp.answer ?? (resp.error || 'AI temporarily unavailable. Please try again.'),
        timestamp: new Date(),
        sourceUsed: resp.source_used,
        latency: resp.latency_ms,
        error: !resp.answer,
      }
      setMessages(prev => [...prev, aiMsg])

      // Refresh history after chat for updated location
      if (resp.location_resolved) {
        setIsHistoryLoading(true)
        getHistory(resp.location_resolved.name, 7)
          .then(d => setHistory(d.history))
          .catch(console.error)
          .finally(() => setIsHistoryLoading(false))
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: `⚠️ ${err?.response?.data?.detail || 'Connection error. Is the backend running?'}`,
        timestamp: new Date(),
        error: true,
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsChatLoading(false)
    }
  }, [location, language])

  // Fetch on location change
  useEffect(() => {
    if (location) fetchWeatherForLocation(location)
  }, [location, fetchWeatherForLocation])

  return {
    location,
    setLocation,
    resolvedLocation,
    currentWeather: null,
    forecast: [],
    alerts,
    history,
    messages,
    isLoading,
    isChatLoading,
    isHistoryLoading,
    language,
    setLanguage,
    sendMessage,
    fetchWeatherForLocation,
    lastSource,
  }
}
