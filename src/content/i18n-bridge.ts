// Locale plumbing for the content script: saved settings value in, overlay
// strings out. Kept apart from sidepanel i18n so React never enters this bundle.

import { getContent as get, type tMerged } from '../i18n/content'
import { resolveLocale } from '../i18n/locale'

export type tOverlayContent = tMerged<'overlay'>

export function getContent(savedLocale: string | undefined): tOverlayContent {
  return get(resolveLocale(savedLocale), 'overlay')
}
