import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  FiSearch, FiMic, FiX, FiArrowRight, FiClock,
  FiTrendingUp, FiTag, FiZap, FiChevronRight, FiAlertCircle
} from 'react-icons/fi'
import { RiStore2Line } from 'react-icons/ri'
import axios from 'axios'
import { useTheme } from '@context/ThemeContext'
import { useShop } from '@context/ShopContext'
import { useVoiceSearch } from '@hooks/useVoiceSearch'
import { useSearchHistory } from '@hooks/useSearchHistory'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const TRENDING_FALLBACK = [
  'Gold Banarasi Silk Saree',
  'Velvet Evening Blazer',
  'Gold Trim Sneakers',
  'Luxe Sport Hoodie',
  'Italian Oxford Boots'
]

/**
 * SearchModal — Full-featured intelligent search overlay
 * Features: real voice, keyboard nav, spell correction, history, suggestions
 */
function SearchModal({ isOpen, onClose }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isDarkMode } = useTheme()
  const { selectedShop, clearShop } = useShop()
  const { history, addSearch, removeSearch, clearHistory } = useSearchHistory()

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState(null) // null = not yet fetched
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)  // keyboard nav

  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const debounceRef = useRef(null)
  const listRef = useRef(null)

  // Voice search hook with real Web Speech API
  const { isSupported: voiceSupported, state: voiceState, transcript, errorMessage: voiceError, start: startVoice, stop: stopVoice } = useVoiceSearch({
    onResult: (text) => {
      setQuery(text)
      fetchSuggestions(text)
    }
  })

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSuggestions(null)
      setActiveIndex(-1)
      setTimeout(() => inputRef.current?.focus(), 80)
    } else {
      // Stop voice if modal closes
      if (voiceState === 'listening') stopVoice()
    }
  }, [isOpen])

  // Sync voice transcript to input
  useEffect(() => {
    if (transcript) setQuery(transcript)
  }, [transcript])

  // Debounced search suggestions
  const fetchSuggestions = useCallback((q) => {
    clearTimeout(debounceRef.current)
    if (!q?.trim()) {
      setSuggestions(null)
      setLoading(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      // Cancel previous request
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()

      setLoading(true)
      try {
        const shopParam = selectedShop?._id ? `&shopId=${selectedShop._id}` : ''
        const res = await axios.get(
          `${API_BASE}/search/suggestions?q=${encodeURIComponent(q.trim())}${shopParam}`,
          { signal: abortRef.current.signal }
        )
        if (res.data?.success) {
          setSuggestions(res.data)
        }
      } catch (err) {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
          console.warn('Search suggestion error:', err.message)
        }
      } finally {
        setLoading(false)
      }
    }, 200)
  }, [selectedShop?._id])

  // Trigger on query change
  useEffect(() => {
    fetchSuggestions(query)
    return () => { clearTimeout(debounceRef.current) }
  }, [query, fetchSuggestions])

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return

    if (e.key === 'Escape') {
      onClose()
      return
    }

    // Build flat navigable list
    const items = listRef.current?.querySelectorAll('[data-nav-item]') || []
    const count = items.length

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => (prev + 1) % count)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => (prev <= 0 ? count - 1 : prev - 1))
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && items[activeIndex]) {
        items[activeIndex].click()
      } else {
        handleSearch()
      }
    }
  }, [isOpen, activeIndex, onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-nav-item]')
      items[activeIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  const handleSearch = (searchQuery = query) => {
    const q = (typeof searchQuery === 'string' ? searchQuery : query).trim()
    if (!q) return
    addSearch(q)
    const shopParam = selectedShop?._id ? `&shopId=${selectedShop._id}` : ''
    navigate(`/products?search=${encodeURIComponent(q)}${shopParam}`)
    onClose()
  }

  const handleSuggestionClick = (item) => {
    if (item.type === 'product') {
      addSearch(item.name)
      navigate(`/products/${item.slug || item.id}`)
      onClose()
    } else if (item.type === 'category') {
      addSearch(item.value)
      navigate(`/products?category=${encodeURIComponent(item.value)}`)
      onClose()
    } else if (item.type === 'brand') {
      addSearch(item.name)
      navigate(`/products?brand=${encodeURIComponent(item.name)}`)
      onClose()
    } else if (item.type === 'history' || item.type === 'trending') {
      setQuery(item.value)
      fetchSuggestions(item.value)
      inputRef.current?.focus()
    }
  }

  const handleCorrectionAccept = () => {
    if (suggestions?.cleanedQuery) {
      setQuery(suggestions.cleanedQuery)
      handleSearch(suggestions.cleanedQuery)
    }
  }

  // Voice button label
  const voiceLabel = {
    idle: t('search.voiceSearch', 'Search by voice'),
    listening: t('search.voiceListening', 'Listening... Click to stop'),
    processing: t('search.voiceProcessing', 'Processing...'),
    result: t('search.voiceResult', 'Voice result'),
    error: t('search.voiceError', 'Voice error'),
    unsupported: t('search.voiceUnsupported', 'Voice search not supported')
  }[voiceState] || ''

  const hasContent = query.trim().length > 0
  const showHistory = !hasContent && history.length > 0
  const showTrending = !hasContent
  const showSuggestions = hasContent && suggestions

  const cardClass = isDarkMode
    ? 'bg-[#0c0c0c]/98 border-white/10 text-white'
    : 'bg-white/98 border-gray-200 text-gray-900'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className={`fixed top-0 left-0 right-0 z-[60] mx-auto max-w-3xl mt-4 sm:mt-8 mx-3 sm:mx-auto rounded-3xl border shadow-2xl overflow-hidden ${cardClass}`}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('search.modalTitle', 'Search SKLP Fashion')}
          >
            {/* Search Input Row */}
            <div className={`flex items-center gap-2 px-4 py-3.5 border-b ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
              {/* Search icon / loading */}
              <div className="shrink-0">
                {loading
                  ? <div className="w-5 h-5 rounded-full border-2 border-luxury-gold border-t-transparent animate-spin" />
                  : <FiSearch className="text-luxury-gold text-xl" />
                }
              </div>

              {/* Input */}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIndex(-1) }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch() } }}
                placeholder={
                  selectedShop
                    ? `${t('search.searchIn', 'Search in')} ${selectedShop.brandName || selectedShop.shopName}...`
                    : t('search.placeholder', 'Search sarees, shoes, shirts, brands...')
                }
                className={`flex-1 bg-transparent text-base outline-none border-0 placeholder-current/40 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                aria-label={t('search.inputLabel', 'Search products')}
                aria-autocomplete="list"
                aria-controls="search-listbox"
                aria-expanded={!!showSuggestions}
                role="combobox"
                autoComplete="off"
                spellCheck="false"
              />

              {/* Clear */}
              {hasContent && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setSuggestions(null); setActiveIndex(-1); inputRef.current?.focus() }}
                  className="shrink-0 p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  aria-label={t('search.clearInput', 'Clear search')}
                >
                  <FiX size={16} />
                </button>
              )}

              {/* Voice button */}
              {voiceSupported && (
                <button
                  type="button"
                  onClick={() => voiceState === 'listening' ? stopVoice() : startVoice()}
                  className={`shrink-0 relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    voiceState === 'listening'
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse'
                      : voiceState === 'error'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : isDarkMode
                      ? 'bg-white/10 text-luxury-gold hover:bg-white/20'
                      : 'bg-luxury-gold/15 text-luxury-gold hover:bg-luxury-gold/25'
                  }`}
                  title={voiceLabel}
                  aria-label={voiceLabel}
                >
                  <FiMic size={17} />
                  {voiceState === 'listening' && (
                    <span className="absolute inset-0 rounded-xl border-2 border-red-400 animate-ping opacity-60" />
                  )}
                </button>
              )}

              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                className={`shrink-0 p-2 rounded-xl border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300' : 'border-gray-200 hover:bg-gray-50 text-gray-500'}`}
                aria-label={t('common.close', 'Close')}
              >
                <FiX size={16} />
              </button>
            </div>

            {/* Shop scope badge */}
            {selectedShop && (
              <div className={`flex items-center gap-2 px-4 py-2 text-xs border-b ${isDarkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-100'}`}>
                <RiStore2Line className="text-amber-500 shrink-0" size={14} />
                <span className={isDarkMode ? 'text-amber-300' : 'text-amber-700'}>
                  {t('search.scopedTo', 'Searching in:')} <strong>{selectedShop.brandName || selectedShop.shopName}</strong>
                </span>
                <button onClick={clearShop} className="ml-auto text-amber-500 hover:underline font-bold uppercase tracking-wider text-[10px]">
                  {t('search.searchAll', 'All brands')}
                </button>
              </div>
            )}

            {/* Voice error */}
            {voiceError && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs">
                <FiAlertCircle size={14} />
                <span>{voiceError}</span>
              </div>
            )}

            {/* Voice listening indicator */}
            {(voiceState === 'listening' || voiceState === 'processing') && (
              <div className="flex items-center gap-3 px-4 py-3 bg-red-500/5 border-b border-red-500/15">
                <div className="flex gap-1">
                  {[0, 150, 300].map(delay => (
                    <span key={delay} className="w-1.5 h-4 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </div>
                <span className="text-xs text-red-400 font-medium">
                  {voiceState === 'listening' ? t('header.listening', 'Listening...') : t('search.voiceProcessing', 'Processing...')}
                </span>
                {transcript && <span className="text-xs opacity-60 ml-2 italic truncate max-w-[200px]">"{transcript}"</span>}
              </div>
            )}

            {/* "Did you mean?" correction banner */}
            {showSuggestions && suggestions?.showCorrection && suggestions?.cleanedQuery && (
              <div className={`flex items-center gap-2 px-4 py-2.5 border-b text-xs ${isDarkMode ? 'bg-luxury-gold/5 border-luxury-gold/20' : 'bg-amber-50 border-amber-100'}`}>
                <FiZap className="text-luxury-gold shrink-0" size={13} />
                <span className={isDarkMode ? 'text-white/70' : 'text-gray-600'}>
                  {t('header.didYouMean', 'Did you mean:')}
                </span>
                <button
                  type="button"
                  onClick={handleCorrectionAccept}
                  className="font-bold text-luxury-gold hover:underline uppercase tracking-wide"
                >
                  {suggestions.cleanedQuery}
                </button>
              </div>
            )}

            {/* Price constraint badge */}
            {showSuggestions && suggestions?.priceConstraint && (
              <div className="flex items-center gap-2 px-4 py-2 border-b border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-400">
                <FiTag size={12} />
                <span>{t('search.priceFilter', 'Price filter:')} <strong>{suggestions.priceConstraint}</strong></span>
              </div>
            )}

            {/* Scrollable suggestions body */}
            <div
              id="search-listbox"
              role="listbox"
              ref={listRef}
              className="max-h-[60vh] overflow-y-auto overscroll-contain"
            >
              {/* ---- RECENT SEARCHES ---- */}
              {showHistory && (
                <div className="px-4 pt-4 pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-luxury-gold flex items-center gap-1.5">
                      <FiClock size={11} /> {t('search.recentSearches', 'Recent Searches')}
                    </p>
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="text-[10px] text-red-400 hover:underline font-bold"
                    >
                      {t('common.clearAll', 'Clear All')}
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    {history.slice(0, 5).map((h, idx) => (
                      <HistoryItem
                        key={h}
                        text={h}
                        active={activeIndex === idx}
                        isDarkMode={isDarkMode}
                        onSelect={() => handleSuggestionClick({ type: 'history', value: h })}
                        onRemove={() => removeSearch(h)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ---- TRENDING ---- */}
              {showTrending && (
                <div className="px-4 pt-3 pb-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-luxury-gold flex items-center gap-1.5 mb-2">
                    <FiTrendingUp size={11} /> {t('header.trendingSearches', 'Trending')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(suggestions?.trending || TRENDING_FALLBACK).map((term, idx) => (
                      <button
                        key={term}
                        type="button"
                        data-nav-item
                        onClick={() => handleSuggestionClick({ type: 'trending', value: term })}
                        className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                          isDarkMode
                            ? 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}
                        style={{ outline: activeIndex === (showHistory ? history.length : 0) + idx ? '2px solid #D4AF37' : 'none' }}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ---- LIVE SUGGESTIONS ---- */}
              {showSuggestions && (
                <div className="pb-4">
                  {/* Brands */}
                  {suggestions.brands?.length > 0 && (
                    <SectionBlock title={t('search.matchingBrands', 'Brands')} isDarkMode={isDarkMode}>
                      {suggestions.brands.map((brand, idx) => (
                        <NavItem
                          key={brand.id}
                          active={isActive(activeIndex, 0, idx, suggestions)}
                          isDarkMode={isDarkMode}
                          onClick={() => handleSuggestionClick({ type: 'brand', name: brand.name })}
                        >
                          <RiStore2Line className="text-luxury-gold shrink-0" size={15} />
                          <span className="flex-1 font-semibold">{brand.name}</span>
                          {brand.rating && <span className="text-[10px] text-amber-400 font-mono">★ {brand.rating}</span>}
                          <FiChevronRight className="text-luxury-gold/40" size={13} />
                        </NavItem>
                      ))}
                    </SectionBlock>
                  )}

                  {/* Categories */}
                  {suggestions.categories?.length > 0 && (
                    <SectionBlock title={t('search.categories', 'Categories')} isDarkMode={isDarkMode}>
                      <div className="flex flex-wrap gap-2 px-4">
                        {suggestions.categories.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            data-nav-item
                            onClick={() => handleSuggestionClick({ type: 'category', value: cat })}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-medium capitalize transition-all ${
                              isDarkMode
                                ? 'border-luxury-gold/20 bg-luxury-gold/5 hover:bg-luxury-gold/15 text-luxury-gold'
                                : 'border-luxury-gold/30 bg-luxury-gold/10 hover:bg-luxury-gold/20 text-luxury-darkGold'
                            }`}
                          >
                            {cat.replace(/-/g, ' ')}
                          </button>
                        ))}
                      </div>
                    </SectionBlock>
                  )}

                  {/* Products */}
                  {suggestions.products?.length > 0 && (
                    <SectionBlock
                      title={t('search.matchingProducts', 'Products')}
                      isDarkMode={isDarkMode}
                      action={
                        <button
                          type="button"
                          onClick={() => handleSearch()}
                          className="text-[10px] text-luxury-gold hover:underline font-bold flex items-center gap-0.5"
                        >
                          {t('search.viewAll', 'View all')} <FiArrowRight size={10} />
                        </button>
                      }
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-4">
                        {suggestions.products.map((prod, idx) => (
                          <Link
                            key={prod.id}
                            to={`/products/${prod.slug || prod.id}`}
                            data-nav-item
                            onClick={() => { addSearch(prod.name); onClose() }}
                            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all group ${
                              isDarkMode
                                ? 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-luxury-gold/30'
                                : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-luxury-gold/40 shadow-sm'
                            }`}
                          >
                            {prod.thumbnail ? (
                              <img
                                src={prod.thumbnail}
                                alt={prod.name}
                                loading="lazy"
                                className="w-12 h-14 object-cover rounded-xl border border-white/10 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-14 rounded-xl bg-luxury-gold/10 flex items-center justify-center text-luxury-gold font-bold text-xs shrink-0">
                                SKLP
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{prod.name}</p>
                              <p className="text-xs text-luxury-gold font-black mt-0.5">₹{prod.price?.toLocaleString('en-IN')}</p>
                              {prod.brand && <p className="text-[10px] text-gray-400 truncate mt-0.5">{prod.brand}</p>}
                            </div>
                            <FiArrowRight className="text-luxury-gold/30 group-hover:text-luxury-gold shrink-0 transition-colors" size={13} />
                          </Link>
                        ))}
                      </div>
                    </SectionBlock>
                  )}

                  {/* No results */}
                  {!loading && suggestions.products?.length === 0 && suggestions.categories?.length === 0 && suggestions.brands?.length === 0 && (
                    <div className="px-4 py-8 text-center">
                      <FiSearch className="mx-auto opacity-20 mb-3 text-luxury-gold" size={32} />
                      <p className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-white/60' : 'text-gray-500'}`}>
                        {t('search.noResults', 'No exact results for')} "{query}"
                      </p>
                      {suggestions?.showCorrection && suggestions?.cleanedQuery && (
                        <p className="text-xs text-luxury-gold mt-2">
                          {t('header.didYouMean', 'Did you mean:')} {' '}
                          <button onClick={handleCorrectionAccept} className="font-bold underline">
                            {suggestions.cleanedQuery}
                          </button>
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSearch()}
                        className="mt-4 px-5 py-2.5 bg-luxury-gold text-black text-xs font-bold rounded-xl uppercase tracking-wider hover:bg-yellow-400 transition-all"
                      >
                        {t('search.searchAnyway', 'Search Anyway')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-between px-4 py-2.5 border-t text-[10px] ${isDarkMode ? 'border-white/10 text-white/30' : 'border-gray-100 text-gray-400'}`}>
              <span>↑↓ {t('search.navigate', 'navigate')} · Enter {t('search.select', 'select')} · Esc {t('search.close', 'close')}</span>
              <span className="text-luxury-gold font-bold tracking-wider">SKLP SMART SEARCH</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ---- Helper to determine active keyboard index ----
function isActive(activeIndex, sectionOffset, itemIdx, suggestions) {
  return activeIndex === sectionOffset + itemIdx
}

// ---- Section block wrapper ----
function SectionBlock({ title, isDarkMode, action, children }) {
  return (
    <div className="pt-3">
      <div className={`flex items-center justify-between mb-2 px-4`}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-luxury-gold">{title}</p>
        {action}
      </div>
      {children}
    </div>
  )
}

// ---- Single history item ----
function HistoryItem({ text, active, isDarkMode, onSelect, onRemove }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer group ${
        active
          ? 'bg-luxury-gold/20 border border-luxury-gold/40'
          : isDarkMode
          ? 'hover:bg-white/5 border border-transparent'
          : 'hover:bg-gray-50 border border-transparent'
      }`}
      data-nav-item
      onClick={onSelect}
      role="option"
      aria-selected={active}
    >
      <FiClock size={13} className="text-luxury-gold/60 shrink-0" />
      <span className={`flex-1 text-sm truncate ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>{text}</span>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onRemove() }}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all p-0.5"
        aria-label={`Remove "${text}" from history`}
      >
        <FiX size={12} />
      </button>
    </div>
  )
}

// ---- Nav item (keyboard navigable) ----
function NavItem({ active, isDarkMode, onClick, children }) {
  return (
    <button
      type="button"
      data-nav-item
      onClick={onClick}
      role="option"
      aria-selected={active}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-all ${
        active
          ? isDarkMode ? 'bg-luxury-gold/15 text-white' : 'bg-luxury-gold/10 text-gray-900'
          : isDarkMode ? 'hover:bg-white/5 text-white/80' : 'hover:bg-gray-50 text-gray-700'
      }`}
    >
      {children}
    </button>
  )
}

export default SearchModal
