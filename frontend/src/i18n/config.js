import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enTranslations from './locales/en.json'
import teTranslations from './locales/te.json'
import hiTranslations from './locales/hi.json'

const getInitialLanguage = () => {
  try {
    const saved = localStorage.getItem('sklp-language')
    if (saved && ['en', 'te', 'hi'].includes(saved)) {
      return saved
    }
  } catch (e) {}
  return 'en'
}

const initialLang = getInitialLanguage()

i18n
  .use(initReactI18next)
  .init({
    lng: initialLang,
    fallbackLng: 'en',
    supportedLngs: ['en', 'te', 'hi'],
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: { translation: enTranslations },
      te: { translation: teTranslations },
      hi: { translation: hiTranslations },
    },
  })

export default i18n

