import axios from 'axios'

export const BACKEND_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:8000'

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LocationInfo {
  name: string
  display_name: string
  lat: number
  lon: number
  country: string
}

export interface CurrentWeather {
  temp_c: number
  feels_like_c: number
  humidity_pct: number
  wind_kmh: number
  rain_mm: number
  condition: string
  icon_code: string
}

export interface ForecastDay {
  date: string
  max_temp_c: number
  min_temp_c: number
  rain_mm: number
  wind_kmh: number
  condition: string
}

export interface WeatherData {
  location: LocationInfo
  current: CurrentWeather
  forecast: ForecastDay[]
  source: string
  stale: boolean
  cached_at: string | null
  cache_hit?: boolean
}

export interface Alert {
  type: string
  label: string
  severity: 'moderate' | 'severe' | 'extreme'
  value: number
  threshold: number
  unit: string
  message: string
  color: string
  icon: string
}

export interface ChatResponse {
  answer: string | null
  location_resolved: LocationInfo | null
  alerts: Alert[]
  source_used: {
    llm: string
    llm_model?: string
    weather: string
    fallback_triggered?: boolean
  }
  latency_ms: number | null
  stale: boolean
  error?: string
}

export interface HistoryDay {
  date: string
  max_temp_c: number
  min_temp_c: number
  rain_mm: number
  wind_kmh: number
}

export interface HealthStatus {
  status: string
  llm: {
    active_provider: string
    last_model: string | null
    last_latency_ms: number | null
    last_used_at: string | null
    total_calls: number
    fallback_count: number
    fallback_rate: number
  }
  weather: {
    active_source: string
    cache_size: number
    cache_hits: number
    cache_total: number
    cache_hit_rate: number
    last_successful_fetch: { 'open-meteo': string | null; openweathermap: string | null }
  }
}

export interface GeocodeResult {
  name: string
  display_name: string
  lat: number
  lon: number
  country: string
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const sendChat = async (
  question: string,
  location: string,
  language: string
): Promise<ChatResponse> => {
  const { data } = await api.post<ChatResponse>('/chat', { question, location, language })
  return data
}

export const getAlerts = async (location: string): Promise<{ alerts: Alert[]; location: LocationInfo; source: string; stale: boolean }> => {
  const { data } = await api.get('/alerts', { params: { location } })
  return data
}

export const getHistory = async (location: string, days = 7): Promise<{ history: HistoryDay[]; location: LocationInfo }> => {
  const { data } = await api.get('/history', { params: { location, days } })
  return data
}

export const getHealth = async (): Promise<HealthStatus> => {
  const { data } = await api.get<HealthStatus>('/health')
  return data
}

export const geocodeSearch = async (q: string): Promise<GeocodeResult[]> => {
  const { data } = await api.get('/geocode', { params: { q } })
  return data.results || []
}
