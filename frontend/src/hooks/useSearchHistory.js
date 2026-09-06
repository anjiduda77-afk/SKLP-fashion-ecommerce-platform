import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'sklp_search_history'
const MAX_HISTORY = 10

/**
 * useSearchHistory — persist recent searches in localStorage
 */
export function useSearchHistory() {
  const [history, setHistory] = useState([])

  // Load on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setHistory(JSON.parse(raw))
    } catch (_) {
      setHistory([])
    }
  }, [])

  const persist = (list) => {
    setHistory(list)
    try { 
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) 
    } catch (_err) {
      // Ignore localStorage access or quota errors
    }
  }

  const addSearch = useCallback((query) => {
    if (!query || typeof query !== 'string' || !query.trim()) return
    const q = query.trim()
    setHistory(prev => {
      // Remove duplicate, add to front, cap at MAX_HISTORY
      const updated = [q, ...prev.filter(h => h.toLowerCase() !== q.toLowerCase())].slice(0, MAX_HISTORY)
      try { 
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) 
      } catch (_err) {
        // Ignore localStorage access or quota errors
      }
      return updated
    })
  }, [])

  const removeSearch = useCallback((query) => {
    setHistory(prev => {
      const updated = prev.filter(h => h !== query)
      try { 
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) 
      } catch (_err) {
        // Ignore localStorage access or quota errors
      }
      return updated
    })
  }, [])

  const clearHistory = useCallback(() => {
    persist([])
  }, [])

  return { history, addSearch, removeSearch, clearHistory }
}

export default useSearchHistory
