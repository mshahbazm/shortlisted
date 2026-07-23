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

/** "Does this look right?" — shown after a CV is parsed (both the has-CV Entry
 *  door and the have-a-resume Build door). Reads/writes the parsed identity in
 *  the store directly (like answersStep), so it needs nothing from the wizard's
 *  ctx beyond `t`. Advances to `next` via the button. Generic in wizard state. */
export function reviewStep<S>(next: string): Step<S, WizCtx> {
  return {
    next,
    view: ({ api, ctx }) => {
      const [profile, saveProfile] = useStore('profile')
      const t = ctx.t
      const setIdentity = (k: keyof Profile['identity'], v: string) =>
        saveProfile({ ...profile, identity: { ...profile.identity, [k]: v } })
      return (
        <StepFrame title={t.reviewTitle} lead={t.reviewLead(profile.work.length, profile.skills.length)}>
          <div className="flex gap-2.5 [&>*]:flex-1">
            <Label className="mb-2.5">{t.firstName}
              <Input type="text" value={profile.identity.firstName} onChange={(e) => setIdentity('firstName', e.target.value)} /></Label>
            <Label className="mb-2.5">{t.lastName}
              <Input type="text" value={profile.identity.lastName} onChange={(e) => setIdentity('lastName', e.target.value)} /></Label>
          </div>
          <Label className="mb-2.5">{t.email}
            <Input type="text" value={profile.identity.email} onChange={(e) => setIdentity('email', e.target.value)} /></Label>
          <div className="flex gap-2.5 [&>*]:flex-1">
            <Label className="mb-2.5">{t.phone}
              <Input type="text" value={profile.identity.phone} onChange={(e) => setIdentity('phone', e.target.value)} /></Label>
            <Label className="mb-2.5">{t.location}
              <Input type="text" value={profile.identity.location} onChange={(e) => setIdentity('location', e.target.value)} /></Label>
          </div>
          <Actions>
            <Button onClick={() => api.next()}>{t.looksRight}</Button>
          </Actions>
        </StepFrame>
      )
    },
  }
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
