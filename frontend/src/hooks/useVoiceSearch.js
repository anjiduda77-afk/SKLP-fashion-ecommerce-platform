import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * useVoiceSearch — Real Web Speech API integration
 * States: idle | listening | processing | result | error | unsupported
 */

// Map i18n language codes to BCP-47 locale codes for speech recognition
const LANG_TO_LOCALE = {
  en: 'en-IN',
  te: 'te-IN',
  hi: 'hi-IN'
}

export function useVoiceSearch({ onResult } = {}) {
  const { i18n } = useTranslation()
  const [state, setState] = useState('idle')   // idle | listening | processing | result | error | unsupported
  const [transcript, setTranscript] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const recognitionRef = useRef(null)

  // Check browser support once
  const SpeechRecognition = typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

  const isSupported = !!SpeechRecognition

  useEffect(() => {
    if (!isSupported) {
      setState('unsupported')
    }
    return () => {
      // Cleanup on unmount
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch (_) {}
      }
    }
  }, [isSupported])

  const start = useCallback(() => {
    if (!isSupported) {
      setState('unsupported')
      return
    }
    if (state === 'listening') return

    try {
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition

      // Configure
      recognition.lang = LANG_TO_LOCALE[i18n.language] || 'en-IN'
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 3

      recognition.onstart = () => {
        setState('listening')
        setTranscript('')
        setErrorMessage('')
      }

      recognition.onresult = (event) => {
        setState('processing')
        let finalText = ''
        let interimText = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const alt = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalText += alt
          } else {
            interimText += alt
          }
        }

        const displayText = finalText || interimText
        setTranscript(displayText)

        if (finalText) {
          setState('result')
          if (onResult) onResult(finalText.trim())
        }
      }

      recognition.onerror = (event) => {
        let message = ''
        switch (event.error) {
          case 'not-allowed':
          case 'permission-denied':
            message = 'Microphone permission denied. Please allow access in browser settings.'
            break
          case 'no-speech':
            message = 'No speech detected. Please try again.'
            break
          case 'audio-capture':
            message = 'No microphone found. Please connect a microphone.'
            break
          case 'network':
            message = 'Network error during voice recognition. Please check your connection.'
            break
          case 'aborted':
            message = ''
            break
          default:
            message = `Voice recognition error: ${event.error}`
        }
        setErrorMessage(message)
        setState(message ? 'error' : 'idle')
      }

      recognition.onend = () => {
        if (state === 'listening' || state === 'processing') {
          setState(prev => prev === 'processing' ? 'result' : 'idle')
        }
      }

      recognition.start()
    } catch (err) {
      setErrorMessage('Failed to start voice recognition.')
      setState('error')
    }
  }, [isSupported, state, i18n.language, onResult, SpeechRecognition])

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (_) {}
    }
    setState('idle')
  }, [])

  const reset = useCallback(() => {
    stop()
    setTranscript('')
    setErrorMessage('')
    setState('idle')
  }, [stop])

  return {
    isSupported,
    state,       // 'idle' | 'listening' | 'processing' | 'result' | 'error' | 'unsupported'
    transcript,
    errorMessage,
    start,
    stop,
    reset,
    isListening: state === 'listening',
    isProcessing: state === 'processing',
  }
}

export default useVoiceSearch
