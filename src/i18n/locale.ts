// Locale codes, labels, and the content-shape helper. Mirrors the cloud app's
// i18n system (same 8 locales, same typed-catalog approach) so the two stay in
// step. The chosen locale persists in Settings (settings.locale); unset means
// "follow the browser language".

export const LOCALES = ['en', 'nl', 'de', 'fr', 'es', 'it', 'pt', 'pl'] as const
export type tLocaleCode = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: tLocaleCode = 'en'

/** Human labels for the language switcher — each in its own language. */
export const LOCALE_LABELS: Record<tLocaleCode, string> = {
  en: 'English',
  nl: 'Nederlands',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  pl: 'Polski',
}

export function isLocale(value: unknown): value is tLocaleCode {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** The browser/extension UI language, mapped onto a supported locale. */
export function detectLocale(): tLocaleCode {
  const raw =
    (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage?.()) ||
    (typeof navigator !== 'undefined' ? navigator.language : '') ||
    ''
  const short = raw.slice(0, 2).toLowerCase()
  return isLocale(short) ? short : DEFAULT_LOCALE
}

/** Saved locale if valid, otherwise the browser language. */
export function resolveLocale(saved: string | undefined): tLocaleCode {
  return isLocale(saved) ? saved : detectLocale()
}

/**
 * The shape every locale must implement: the English content with string
 * literals widened to `string` and function signatures preserved. Non-English
 * locales are typed against this, so a missing or mistyped key fails the
 * build — translations can't silently drift from English.
 */
export type Localized<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => R
    : T extends object
      ? { -readonly [K in keyof T]: Localized<T[K]> }
      : T
