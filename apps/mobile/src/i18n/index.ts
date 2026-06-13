import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { NativeModules, Platform } from 'react-native'

import es from './es'
import en from './en'
import pt from './pt'

// Detect device language without expo-localization
const getDeviceLang = (): string => {
  try {
    const locale: string =
      (Platform.OS === 'android'
        ? NativeModules.I18nManager?.localeIdentifier
        : NativeModules.SettingsManager?.settings?.AppleLocale ||
          NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]) ?? 'es'
    return locale.substring(0, 2).toLowerCase()
  } catch {
    return 'es'
  }
}

const deviceLang = getDeviceLang()
const supportedLang = ['es', 'en', 'pt'].includes(deviceLang) ? deviceLang : 'es'

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
    pt: { translation: pt },
  },
  lng: supportedLang,
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
})

export default i18n
export { useTranslation } from 'react-i18next'
