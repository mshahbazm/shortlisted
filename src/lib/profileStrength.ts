// How complete a profile is, as one number and a list of what's missing.
//
// PLACEHOLDER RUBRIC. This is a local heuristic over what's filled in, not a
// judgement of how well the CV is written. The real thing is a second scoring
// rubric — CV-writing best practice, researched rather than invented — run as
// its own cloud pipeline, and shared with CV generation so the system scores by
// the same rules it writes by. Until that exists, this keeps the meter honest
// about the one thing it can actually measure: whether the facts are there.
//
// Weights sum to 100. Each gap names the screen that fixes it, so a chip in the
// meter can take the user straight there.

import { Profile } from './types'
import { needsCompletion } from './profileMerge'

export type GapKey =
  | 'name'
  | 'contact'
  | 'headline'
  | 'workDates'
  | 'workHighlights'
  | 'education'
  | 'skills'
  | 'answers'

export interface Gap {
  key: GapKey
  /** Screen in ProfileTab that fixes it. */
  screen: string
}

interface Rule {
  key: GapKey
  weight: number
  screen: string
  met: (p: Profile) => boolean
}

const RULES: Rule[] = [
  {
    key: 'name',
    weight: 10,
    screen: 'about',
    met: (p) => Boolean(p.identity.firstName.trim() && p.identity.lastName.trim()),
  },
  {
    key: 'contact',
    weight: 10,
    screen: 'about',
    met: (p) => Boolean(p.identity.email.trim() && p.identity.location.trim()),
  },
  {
    key: 'headline',
    weight: 10,
    screen: 'about',
    met: (p) => Boolean(p.headline.trim() && p.summary.trim()),
  },
  {
    // Every role carries a title and a start date. A role missing them reads as
    // a gap in the history on any CV built from this profile.
    key: 'workDates',
    weight: 25,
    screen: 'work',
    met: (p) => p.work.length > 0 && p.work.every((w) => !needsCompletion(w)),
  },
  {
    // Concrete achievements on the most recent role — the part of a CV that
    // actually gets read.
    key: 'workHighlights',
    weight: 15,
    screen: 'work',
    met: (p) => (p.work[0]?.highlights.filter((h) => h.trim()).length ?? 0) >= 2,
  },
  { key: 'education', weight: 8, screen: 'education', met: (p) => p.education.length > 0 },
  { key: 'skills', weight: 7, screen: 'about', met: (p) => p.skills.length >= 8 },
  {
    key: 'answers',
    weight: 15,
    screen: 'facts',
    met: (p) => Object.values(p.facts).filter((v) => v && String(v).trim()).length >= 5,
  },
]

export function profileStrength(p: Profile): { percent: number; gaps: Gap[] } {
  let earned = 0
  const gaps: Gap[] = []
  for (const rule of RULES) {
    if (rule.met(p)) earned += rule.weight
    else gaps.push({ key: rule.key, screen: rule.screen })
  }
  return { percent: earned, gaps }
}
