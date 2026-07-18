import type { Localized } from '../../locale'
import { common } from './common'
import { nav } from './nav'
import { onboarding } from './onboarding'
import { apply } from './apply'
import { profile } from './profile'
import { resumes } from './resumes'
import { questions } from './questions'
import { settings } from './settings'
import { overlay } from './overlay'

// One file per namespace = one surface (a tab, the wizard, the on-page panel).
// English is the source of truth for content AND structure: list a module here
// and it becomes a typed namespace every locale must provide (see `tLocale`).
export const en = {
  common,
  nav,
  onboarding,
  apply,
  profile,
  resumes,
  questions,
  settings,
  overlay,
}

/** The shape every locale must implement (English, literals widened). */
export type tLocale = Localized<typeof en>
