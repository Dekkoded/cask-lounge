import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Locale-Ressourcen sind nach Bereich getrennt (eine JSON-Datei je Bereich
// und Sprache) und werden hier zu einem Objekt je Sprache zusammengeführt.
// Jeder Bereich hat einen eindeutigen Top-Level-Namespace, daher gibt es
// beim Spread keine Schlüssel-Kollisionen.
import deCommon from './locales/de/common.json'
import deAuth from './locales/de/auth.json'
import deLanding from './locales/de/landing.json'
import deWhisky from './locales/de/whisky.json'
import deGroups from './locales/de/groups.json'
import deTasting from './locales/de/tasting.json'
import deProfile from './locales/de/profile.json'
import deMember from './locales/de/member.json'
import deCompare from './locales/de/compare.json'
import deBattle from './locales/de/battle.json'

import enCommon from './locales/en/common.json'
import enAuth from './locales/en/auth.json'
import enLanding from './locales/en/landing.json'
import enWhisky from './locales/en/whisky.json'
import enGroups from './locales/en/groups.json'
import enTasting from './locales/en/tasting.json'
import enProfile from './locales/en/profile.json'
import enMember from './locales/en/member.json'
import enCompare from './locales/en/compare.json'
import enBattle from './locales/en/battle.json'

export const LANGUAGES = [
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
] as const

export type LangCode = (typeof LANGUAGES)[number]['code']

const de = { ...deCommon, ...deAuth, ...deLanding, ...deWhisky, ...deGroups, ...deTasting, ...deProfile, ...deMember, ...deCompare, ...deBattle }
const en = { ...enCommon, ...enAuth, ...enLanding, ...enWhisky, ...enGroups, ...enTasting, ...enProfile, ...enMember, ...enCompare, ...enBattle }

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en },
    },
    fallbackLng: 'de',
    supportedLngs: LANGUAGES.map(l => l.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'cl_lang',
      caches: ['localStorage'],
    },
  })

// <html lang> mit der aktiven Sprache synchron halten (Accessibility/SEO).
const syncHtmlLang = (lng: string) => {
  document.documentElement.lang = lng
}
syncHtmlLang(i18n.resolvedLanguage ?? 'de')
i18n.on('languageChanged', syncHtmlLang)

export default i18n
