// Typed UI content, mirroring the cloud app's i18n. React surfaces use
// useContent(); non-React code (content script) imports getContent from
// './content' directly to keep React out of that bundle.

import { useMemo } from 'react'

import { useStore } from '../sidepanel/hooks'
import { locales, type tLocale } from './locales'
import { resolveLocale } from './locale'
import type { tMerged, tNamespace } from './content'

export { LOCALES, LOCALE_LABELS, DEFAULT_LOCALE, isLocale, resolveLocale } from './locale'
export type { tLocaleCode } from './locale'
export type { tLocale } from './locales'
export { getContent } from './content'
export type { tMerged, tNamespace } from './content'

/**
 * Access UI content for the active locale (settings.locale, falling back to
 * the browser language), with `common` always merged in. Reactive: changing
 * the language in Settings re-renders every consumer.
 *
 * @example const t = useContent()            // common only
 * @example const t = useContent('apply')     // common + apply (apply wins on clash)
 */
export function useContent(): tLocale['common']
export function useContent<K extends tNamespace>(namespace: K): tMerged<K>
export function useContent<K extends tNamespace>(namespace?: K) {
  const [settings] = useStore('settings')
  const locale = resolveLocale(settings.locale)
  return useMemo(() => {
    const L: tLocale = locales[locale]
    if (!namespace) return L.common
    return { ...L.common, ...L[namespace] }
  }, [locale, namespace])
}
