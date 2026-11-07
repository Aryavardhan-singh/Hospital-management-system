import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enTranslation from './locales/en/translation.json'
import hiTranslation from './locales/hi/translation.json'

const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('mednet_language') : null
const initialLanguage = savedLanguage === 'hi' || savedLanguage === 'en' ? savedLanguage : 'en'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      hi: { translation: hiTranslation },
    },
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
