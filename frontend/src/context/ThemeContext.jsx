import { createContext, useContext, useState, useEffect } from 'react'
import i18n from '../i18n/config'

const ThemeContext = createContext()

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [language, setLanguage] = useState('en')

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const savedLanguage = localStorage.getItem('language')

    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark')
    }
    if (savedLanguage) {
      setLanguage(savedLanguage)
      i18n.changeLanguage(savedLanguage)
    }
  }, [])

  // Apply theme to document
  useEffect(() => {
    const htmlElement = document.documentElement
    if (isDarkMode) {
      htmlElement.classList.add('dark')
    } else {
      htmlElement.classList.remove('dark')
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const changeLanguage = (lang) => {
    setLanguage(lang)
    localStorage.setItem('language', lang)
    i18n.changeLanguage(lang)
  }

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        toggleTheme,
        language,
        changeLanguage,
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
