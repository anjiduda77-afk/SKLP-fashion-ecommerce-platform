import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * useVoiceSearch — Robust Web Speech API integration with microphone permission checks
 * States: idle | listening | processing | result | error | unsupported
 */

const LANG_TO_LOCALE = {
  en: 'en-IN',
  te: 'te-IN',
  hi: 'hi-IN'
}

const getSpeechRecognition = () =>
  typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null

export function useVoiceSearch({ onResult } = {}) {
  const { i18n } = useTranslation()
  const [state, setState] = useState('idle') // idle | listening | processing | result | error | unsupported
  const [transcript, setTranscript] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const recognitionRef = useRef(null)
  const onResultRef = useRef(onResult)
  const stateRef = useRef(state)
  const timerRef = useRef(null)

  // Keep refs synchronized to avoid stale closures in callbacks
  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const SpeechRecognition = getSpeechRecognition()
  const isSupported = !!SpeechRecognition

  useEffect(() => {
    if (!isSupported) {
      setState('unsupported')
    }
    return () => {
      clearTimeout(timerRef.current)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (_err) {
          // Ignore recognition abort errors on cleanup
        }
      }
    }
  }, [isSupported])

  const stop = useCallback(() => {
    clearTimeout(timerRef.current)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (_err) {
        // Ignore recognition stop errors
      }
    }
    setState('idle')
  }, [])

  const reset = useCallback(() => {
    stop()
    setTranscript('')
    setErrorMessage('')
    setState('idle')
  }, [stop])

  const start = useCallback(async () => {
    clearTimeout(timerRef.current)

    if (!isSupported) {
      setState('unsupported')
      setErrorMessage('Voice search is not supported in this browser. Please use Chrome, Edge, or Safari.')
      return
    }

    if (stateRef.current === 'listening' || stateRef.current === 'processing') {
      stop()
      return
    }

    try {
      // Abort previous instance if any exists
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch (_e) {
          // ignore abort error
        }
      }

      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition

      const selectedLang = LANG_TO_LOCALE[i18n.language] || 'en-IN'
      recognition.lang = selectedLang
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

        if (finalText && finalText.trim()) {
          setState('result')
          if (onResultRef.current) {
            onResultRef.current(finalText.trim())
          }
        }
      }

      recognition.onerror = (event) => {
        let message = ''
        switch (event.error) {
          case 'not-allowed':
          case 'permission-denied':
            message = 'Microphone permission denied. Please allow microphone access in your browser settings.'
            break
          case 'no-speech':
            message = 'No speech detected. Tap the mic to try again.'
            break
          case 'audio-capture':
            message = 'No microphone found. Please connect a microphone and try again.'
            break
          case 'network':
            message = 'Network error during voice recognition. Please check your internet connection.'
            break
          case 'language-not-supported':
            // Fallback to en-IN/en-US if dialect fails
            try {
              recognition.lang = 'en-US'
              recognition.start()
              return
            } catch (_fallbackErr) {
              message = 'Language not supported by speech recognizer.'
            }
            break
          case 'aborted':
            message = ''
            break
          default:
            message = `Voice error: ${event.error}`
        }

        setErrorMessage(message)
        setState(message ? 'error' : 'idle')

        // Auto-recover from soft errors like no-speech after 3 seconds
        if (event.error === 'no-speech' || event.error === 'network') {
          timerRef.current = setTimeout(() => {
            if (stateRef.current === 'error') {
              setState('idle')
            }
          }, 3000)
        }
      }

      recognition.onend = () => {
        if (stateRef.current === 'listening' || stateRef.current === 'processing') {
          setState(prev => prev === 'processing' ? 'result' : 'idle')
        }
      }

      recognition.start()
    } catch (err) {
      setErrorMessage('Could not initiate voice recognition. Tap to try again.')
      setState('error')
    }
  }, [isSupported, i18n.language, stop, SpeechRecognition])

  return {
    isSupported,
    state, // 'idle' | 'listening' | 'processing' | 'result' | 'error' | 'unsupported'
    transcript,
    errorMessage,
    start,
    stop,
    reset,
    isListening: state === 'listening',
    isProcessing: state === 'processing'
  }
}

export default useVoiceSearch
