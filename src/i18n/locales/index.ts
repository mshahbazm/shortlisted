import { en } from './en'
import { nl } from './nl'
import { de } from './de'
import { fr } from './fr'
import { es } from './es'
import { it } from './it'
import { pt } from './pt'
import { pl } from './pl'

/** All locales, keyed by code. `useContent`/`getContent` pick from here. */
export const locales = { en, nl, de, fr, es, it, pt, pl }

export { en, nl, de, fr, es, it, pt, pl }
export type { tLocale } from './en'
