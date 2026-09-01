import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import i18n from '../i18n/config'

const ThemeContext = createContext()

const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem('sklp-theme')
    if (saved === 'light' || saved === 'dark') {
      return saved
    }
  } catch (_e) { /* localStorage unavailable in SSR/sandboxed env */ }
  return 'dark'
}

const getInitialLanguage = () => {
  try {
    const saved = localStorage.getItem('sklp-language')
    if (saved && ['en', 'te', 'hi'].includes(saved)) {
      return saved
    }
  } catch (_e) { /* localStorage unavailable in SSR/sandboxed env */ }
  return 'en'
}

// Early execution to prevent any theme flashing
if (typeof document !== 'undefined') {
  const initialTheme = getInitialTheme()
  if (initialTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  const initialLang = getInitialLanguage()
  document.documentElement.lang = initialLang
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme)
  const isDarkMode = theme === 'dark'
  const [language, setLanguageState] = useState(getInitialLanguage)

  // Apply theme class to document element and persist
  useEffect(() => {
    const htmlElement = document.documentElement
    if (theme === 'dark') {
      htmlElement.classList.add('dark')
    } else {
      htmlElement.classList.remove('dark')
    }
    localStorage.setItem('sklp-theme', theme)
  }, [theme])

  // Sync language attribute on html tag
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const changeLanguage = useCallback((lang) => {
    if (['en', 'te', 'hi'].includes(lang)) {
      setLanguageState(lang)
      localStorage.setItem('sklp-language', lang)
      i18n.changeLanguage(lang)
      document.documentElement.lang = lang
    }
  }, [])

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDarkMode,
        toggleTheme,
        language,
        changeLanguage,
        supportedLanguages: [
          { code: 'en', name: 'English', nativeName: 'English' },
          { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
          { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
        ],
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

