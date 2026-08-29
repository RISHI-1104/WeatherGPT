import { useState, useEffect, useCallback, useRef } from 'react'

interface UseSpeechReturn {
  speechSupported: boolean
  permissionDenied: boolean
  isListening: boolean
  transcript: string
  ttsPlaying: boolean
  startListening: () => void
  stopListening: () => void
  speak: (text: string) => void
  stopSpeaking: () => void
  resetTranscript: () => void
}

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export function useSpeech(): UseSpeechReturn {
  const [speechSupported, setSpeechSupported] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [ttsPlaying, setTtsPlaying] = useState(false)

  const recognitionRef = useRef<any>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Detect browser support on mount
  useEffect(() => {
    const SpeechRecognitionImpl =
      window.SpeechRecognition || window.webkitSpeechRecognition
    setSpeechSupported(!!SpeechRecognitionImpl)
  }, [])

  const startListening = useCallback(() => {
    const SpeechRecognitionImpl =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognitionImpl) {
      setSpeechSupported(false)
      return
    }

    const recognition = new SpeechRecognitionImpl()
    recognition.lang = 'en-IN'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }
      setTranscript(finalTranscript || interimTranscript)
    }

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setPermissionDenied(true)
      }
      setIsListening(false)
    }

    recognition.onend = () => setIsListening(false)

    try {
      recognition.start()
      recognitionRef.current = recognition
    } catch {
      setIsListening(false)
    }
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const resetTranscript = useCallback(() => setTranscript(''), [])

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()

    // Strip markdown for TTS
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/`(.*?)`/g, '$1')
      .trim()

    if (!cleanText) return

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = 'en-IN'
    utterance.rate = 0.95
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => setTtsPlaying(true)
    utterance.onend = () => setTtsPlaying(false)
    utterance.onerror = () => setTtsPlaying(false)

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    setTtsPlaying(false)
  }, [])

  return {
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
  }
}
