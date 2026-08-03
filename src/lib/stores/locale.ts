import { browser } from '$app/environment'
import { get, writable } from 'svelte/store'
import enMessages from '../../i18n/locales/en.json'
import frMessages from '../../i18n/locales/fr.json'
import hiINMessages from '../../i18n/locales/hi-IN.json'
import zhCNMessages from '../../i18n/locales/zh-CN.json'
import jaMessages from '../../i18n/locales/ja.json'
import urMessages from '../../i18n/locales/ur.json'
import ptMessages from '../../i18n/locales/pt.json'
import ruMessages from '../../i18n/locales/ru.json'
import esMessages from '../../i18n/locales/es.json'
import arMessages from '../../i18n/locales/ar.json'
import { setDirection } from './theme'

export type Messages = Record<string, string>
export type Locale = 'en' | 'fr' | 'hi-IN' | 'zh-CN' | 'ja' | 'ur' | 'pt' | 'ru' | 'es' | 'ar'
export type TranslateVars = Record<string, string | number>

export const LOCALE_STORAGE_KEY = 'adminex-locale'
export const DIRECTION_LOCK_STORAGE_KEY = 'adminex-direction-locked-by-locale'
export const supportedLocales: Locale[] = ['en', 'fr', 'hi-IN', 'zh-CN', 'ja', 'ur', 'pt', 'ru', 'es', 'ar']

const messagesByLocale: Record<Locale, Messages> = {
  en: enMessages as Messages,
  fr: frMessages as Messages,
  'hi-IN': hiINMessages as Messages,
  'zh-CN': zhCNMessages as Messages,
  ja: jaMessages as Messages,
  ur: urMessages as Messages,
  pt: ptMessages as Messages,
  ru: ruMessages as Messages,
  es: esMessages as Messages,
  ar: arMessages as Messages,
}

function normalizeLocale(value: string | null | undefined): Locale {
  return value && supportedLocales.includes(value as Locale) ? (value as Locale) : 'en'
}

function readStoredLocale(): Locale {
  if (!browser) return 'en'
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
  const normalized = normalizeLocale(saved)
  if (saved && saved !== normalized) localStorage.removeItem(LOCALE_STORAGE_KEY)
  return normalized
}

export const locale = writable<Locale>(readStoredLocale())

export function messagesFor(value: Locale): Messages {
  return value === 'en' ? messagesByLocale.en : { ...messagesByLocale.en, ...messagesByLocale[value] }
}

export function translate(key: string, vars?: TranslateVars): string {
  const messages = messagesFor(get(locale))
  const template = messages[key] ?? messagesByLocale.en[key] ?? key
  if (!vars) return template
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, rawName: string) => {
    const value = vars[String(rawName).trim()]
    return value === undefined ? match : String(value)
  })
}

export function setLocale(value: Locale): void {
  const next = normalizeLocale(value)
  locale.set(next)
  if (browser) {
    localStorage.setItem(LOCALE_STORAGE_KEY, next)
    document.documentElement.lang = next
  }
  const rtl = next === 'ar' || next === 'ur'
  if (rtl) {
    if (browser) localStorage.setItem(DIRECTION_LOCK_STORAGE_KEY, '1')
    setDirection('rtl')
  } else if (browser && localStorage.getItem(DIRECTION_LOCK_STORAGE_KEY) === '1') {
    localStorage.removeItem(DIRECTION_LOCK_STORAGE_KEY)
    setDirection('ltr')
  }
}

export function initializeLocale(): void {
  if (!browser) return
  const current = get(locale)
  document.documentElement.lang = current
  const rtl = current === 'ar' || current === 'ur'
  if (rtl) setDirection('rtl')
}
