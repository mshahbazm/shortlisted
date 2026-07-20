import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Join class names, letting later ones win over earlier ones.
 *
 * clsx handles the conditionals; tailwind-merge resolves conflicts, so a
 * component's own `px-3` loses to a caller's `px-6` instead of both landing in
 * the class list and the winner being whichever CSS rule happens to come last.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
