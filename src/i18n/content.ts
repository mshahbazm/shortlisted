// Pure content access — no React. The content script imports from HERE so the
// on-page bundle never drags React in; sidepanel code uses useContent (index.ts).

import { locales, type tLocale } from './locales'
import { DEFAULT_LOCALE, type tLocaleCode } from './locale'

/** Namespaces a caller can request — every top-level key except always-merged `common`. */
export type tNamespace = Exclude<keyof tLocale, 'common'>

/** `common` merged with namespace `K` (the namespace wins on key collisions). */
export type tMerged<K extends tNamespace> = Omit<tLocale['common'], keyof tLocale[K]> & tLocale[K]

/** Explicit-locale content lookup, `common` always merged in. */
export function getContent(locale: tLocaleCode): tLocale['common']
export function getContent<K extends tNamespace>(locale: tLocaleCode, namespace: K): tMerged<K>
export function getContent<K extends tNamespace>(locale: tLocaleCode, namespace?: K) {
  const L: tLocale = locales[locale] ?? locales[DEFAULT_LOCALE]
  if (!namespace) return L.common
  return { ...L.common, ...L[namespace] }
}
