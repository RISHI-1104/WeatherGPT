export type UnitSystem = 'metric' | 'imperial'

export function convertTemp(celsius: number, unit: UnitSystem): number {
  if (unit === 'imperial') {
    return Math.round((celsius * 9) / 5 + 32)
  }
  return Math.round(celsius)
}

export function formatTemp(celsius: number, unit: UnitSystem): string {
  return `${convertTemp(celsius, unit)}°${unit === 'imperial' ? 'F' : 'C'}`
}

export function convertWind(kmh: number, unit: UnitSystem): number {
  if (unit === 'imperial') {
    return Math.round(kmh * 0.621371)
  }
  return Math.round(kmh)
}

export function formatWind(kmh: number, unit: UnitSystem): string {
  return `${convertWind(kmh, unit)} ${unit === 'imperial' ? 'mph' : 'km/h'}`
}

export function convertRain(mm: number, unit: UnitSystem): number {
  if (unit === 'imperial') {
    return Number((mm * 0.0393701).toFixed(2))
  }
  return Number(mm.toFixed(1))
}

export function formatRain(mm: number, unit: UnitSystem): string {
  return `${convertRain(mm, unit)} ${unit === 'imperial' ? 'in' : 'mm'}`
}
