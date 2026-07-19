// Fit-score presentation: the model scores 1-10; users see a percentage and
// a colored verdict band. One red, two yellows, two greens — five words,
// three color families, so the traffic-light read stays instant.

export type FitBand = 'longShot' | 'borderline' | 'worthAShot' | 'goodFit' | 'strongFit'

export function fitBand(score10: number): FitBand {
  if (score10 <= 4) return 'longShot'
  if (score10 === 5) return 'borderline'
  if (score10 === 6) return 'worthAShot'
  if (score10 <= 8) return 'goodFit'
  return 'strongFit'
}

export const fitPercent = (score10: number): string => `${score10 * 10}%`

/** Light background / border / accent text per band. */
export const FIT_COLORS: Record<FitBand, { bg: string; border: string; fg: string }> = {
  longShot: { bg: '#fef2f2', border: '#fecaca', fg: '#b91c1c' },
  borderline: { bg: '#fefce8', border: '#fde68a', fg: '#a16207' },
  worthAShot: { bg: '#fefce8', border: '#fde68a', fg: '#a16207' },
  goodFit: { bg: '#f0fdf4', border: '#bbf7d0', fg: '#15803d' },
  strongFit: { bg: '#dcfce7', border: '#86efac', fg: '#166534' },
}
