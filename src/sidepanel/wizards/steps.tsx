// Steps shared across the onboarding wizards. A step is data, so both Entry and
// Build reference the same one. (The OTP email/code pair lives in entry.tsx for
// now; Phase 2 will lift it here to also replace SettingsTab's duplicate auth.)

import { useContent } from '../../i18n'
import { Button, Input, Label } from '../ui'
import { StepFrame, Actions, type BaseCtx, type Step } from '../wizard'
import { useStore } from '../hooks'
import { Profile } from '../../lib/types'

export type OnbContent = ReturnType<typeof useContent<'onboarding'>>

/** The context every onboarding wizard provides: the i18n bundle and a `finish`
 *  that ends the wizard (the App router then decides where the user lands). */
export interface WizCtx extends BaseCtx {
  t: OnbContent
  finish: () => void
}

/** The answer-bank seed — the final step of both the has-CV (Entry) and no-CV
 *  (Build) paths. Reads and writes the persisted profile facts directly and
 *  ends the wizard via `finish`. Generic in the wizard's state (it uses none). */
export function answersStep<S>(): Step<S, WizCtx> {
  return {
    view: ({ ctx }) => {
      const [profile, saveProfile] = useStore('profile')
      const t = ctx.t
      const setFact = (k: keyof Profile['facts'], v: string) =>
        saveProfile({ ...profile, facts: { ...profile.facts, [k]: v } })
      return (
        <StepFrame title={t.answersTitle} lead={t.answersLead}>
          <Label className="mb-2.5">{t.jobTypeLabel}
            <Input type="text" placeholder={t.jobTypePlaceholder} value={profile.facts.jobType ?? ''}
              onChange={(e) => setFact('jobType', e.target.value)} autoFocus /></Label>
          <Label className="mb-2.5">{t.salaryLabel}
            <Input type="text" placeholder={t.salaryPlaceholder} value={profile.facts.salaryExpectation ?? ''}
              onChange={(e) => setFact('salaryExpectation', e.target.value)} /></Label>
          <Label className="mb-2.5">{t.noticeLabel}
            <Input type="text" placeholder={t.noticePlaceholder} value={profile.facts.noticePeriod ?? ''}
              onChange={(e) => setFact('noticePeriod', e.target.value)} /></Label>
          <Label className="mb-2.5">{t.sponsorshipLabel}
            <Input type="text" placeholder={t.sponsorshipPlaceholder} value={profile.facts.needsSponsorship ?? ''}
              onChange={(e) => setFact('needsSponsorship', e.target.value)} /></Label>
          <Actions>
            <Button onClick={ctx.finish}>{t.continue}</Button>
            <Button variant="link" onClick={ctx.finish}>{t.skip}</Button>
          </Actions>
        </StepFrame>
      )
    },
  }
}
