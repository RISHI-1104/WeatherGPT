import { useState, useEffect, useRef, useCallback } from 'react'

export function useAmbientSound(weatherCodeOrIcon: string = 'sunny') {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const soundNodesRef = useRef<any[]>([])

  const stopSound = useCallback(() => {
    soundNodesRef.current.forEach(node => {
      try {
        if (node.stop) node.stop()
        node.disconnect()
      } catch {
        // already stopped
      }
    })
    soundNodesRef.current = []
    if (gainNodeRef.current && audioCtxRef.current) {
      try {
        gainNodeRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime)
      } catch {
        // context closed
      }
    }
    setIsPlaying(false)
  }, [])

  const startSound = useCallback(() => {
    stopSound()

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return

      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx()
      }

      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      const masterGain = ctx.createGain()
      masterGain.gain.setValueAtTime(0.08, ctx.currentTime) // soft ambient volume
      masterGain.connect(ctx.destination)
      gainNodeRef.current = masterGain

      const icon = weatherCodeOrIcon.toLowerCase()
      const isRain = icon.includes('rain') || icon.includes('drizzle') || icon.includes('thunder')
      const isWindy = icon.includes('cloud') || icon.includes('fog') || icon.includes('wind')

      if (isRain) {
        // Pink/Brown noise for rain sound synthesis
        const bufferSize = ctx.sampleRate * 2
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const output = buffer.getChannelData(0)
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1
          b0 = 0.99886 * b0 + white * 0.0555179
          b1 = 0.99332 * b1 + white * 0.0750759
          b2 = 0.96900 * b2 + white * 0.1538520
          b3 = 0.86650 * b3 + white * 0.3104856
          b4 = 0.55000 * b4 + white * 0.5329522
          b5 = -0.7616 * b5 - white * 0.0168980
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04
          b6 = white * 0.115926
        }

        const whiteNoise = ctx.createBufferSource()
        whiteNoise.buffer = buffer
        whiteNoise.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(icon.includes('heavy') ? 2200 : 1200, ctx.currentTime)

        whiteNoise.connect(filter)
        filter.connect(masterGain)
        whiteNoise.start()
        soundNodesRef.current.push(whiteNoise, filter)
      } else if (isWindy) {
        // Soft modulated breeze
        const bufferSize = ctx.sampleRate * 2
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        let lastOut = 0.0
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1
          data[i] = (lastOut + 0.02 * white) / 1.02
          lastOut = data[i]
          data[i] *= 0.15
        }

        const noise = ctx.createBufferSource()
        noise.buffer = buffer
        noise.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.setValueAtTime(450, ctx.currentTime)
        filter.Q.setValueAtTime(3.0, ctx.currentTime)

        // LFO for swaying breeze
        const lfo = ctx.createOscillator()
        lfo.frequency.setValueAtTime(0.2, ctx.currentTime)
        const lfoGain = ctx.createGain()
        lfoGain.gain.setValueAtTime(200, ctx.currentTime)
        lfo.connect(lfoGain)
        lfoGain.connect(filter.frequency)

        noise.connect(filter)
        filter.connect(masterGain)

        noise.start()
        lfo.start()
        soundNodesRef.current.push(noise, filter, lfo, lfoGain)
      } else {
        // Warm fair-weather ambient harmonic drone
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        osc1.type = 'sine'
        osc2.type = 'sine'
        osc1.frequency.setValueAtTime(174.61, ctx.currentTime) // F3
        osc2.frequency.setValueAtTime(261.63, ctx.currentTime) // C4

        const subGain = ctx.createGain()
        subGain.gain.setValueAtTime(0.04, ctx.currentTime)

        osc1.connect(subGain)
        osc2.connect(subGain)
        subGain.connect(masterGain)

        osc1.start()
        osc2.start()
        soundNodesRef.current.push(osc1, osc2, subGain)
      }

      setIsPlaying(true)
    } catch (err) {
      console.error('Web Audio ambient sound error:', err)
      setIsPlaying(false)
    }
  }, [weatherCodeOrIcon, stopSound])

  const toggleSound = useCallback(() => {
    if (isPlaying) {
      stopSound()
    } else {
      startSound()
    }
  }, [isPlaying, startSound, stopSound])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSound()
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close()
        } catch {
          // ignore
        }
      }
    }
  }, [stopSound])

  return {
    isPlaying,
    toggleSound,
    startSound,
    stopSound,
  }
}
