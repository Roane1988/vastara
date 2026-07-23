import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import id from './locales/id/translation.json'
import en from './locales/en/translation.json'

i18n.use(initReactI18next).init({
  resources: {
    id: { translation: id },
    en: { translation: en },
  },
  lng: 'id',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
