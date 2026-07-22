// Wizard B — "Let's build your resume together". Shown when the user is logged
// in but has no profile yet (the App router decides that). Branches on the
// persona choice, then the backend's follow-up questions become one dynamic step
// each (the self-looping `probe`). Proves branch + dynamic + async + back.

import { useContent } from '../../i18n'
import { useStore } from '../hooks'
import { BigChoice, Button, Textarea } from '../ui'
import { StepFrame, Actions, ErrLine, WizardShell, useWizard, wizard, type Step } from '../wizard'
import { runBuildProfile } from '../../ai/run'
import { markResumeHelpDone } from '../../lib/types'
import * as store from '../../lib/store'
import { WizCtx, answersStep } from './steps'

interface BuildState {
  persona: 'starting' | 'working'
  intro: string
  questions: string[]
  answers: string[]
  qi: number // which question is showing
}
const initBuild = (): BuildState => ({ persona: 'working', intro: '', questions: [], answers: [], qi: 0 })

interface BuildCtx extends WizCtx {
  /** Free-form text (+ optional answers) → a starting profile, saved keeping
   *  existing facts; returns the AI's follow-up questions for the first pass. */
  build: (intro: string, persona: BuildState['persona'], answers?: { q: string; a: string }[]) => Promise<{ questions: string[] }>
}

const persona: Step<BuildState, BuildCtx> = {
  next: 'talk',
  view: ({ api, ctx }) => (
    <StepFrame title={ctx.t.buildTitle} lead={ctx.t.buildLead}>
      <div className="flex flex-col gap-2.5">
        <BigChoice title={<>{ctx.t.buildStartingTitle}</>} sub={<>{ctx.t.buildStartingSub}</>} onClick={() => api.next({ persona: 'starting' })} />
        <BigChoice title={<>{ctx.t.buildWorkingTitle}</>} sub={<>{ctx.t.buildWorkingSub}</>} onClick={() => api.next({ persona: 'working' })} />
      </div>
    </StepFrame>
  ),
}

const talk: Step<BuildState, BuildCtx> = {
  view: ({ api, ctx }) => {
    const s = api.state
    const isNew = s.persona === 'starting'
    return (
      <StepFrame
        busy={api.busy}
        busyTitle={ctx.t.buildingTitle}
        title={isNew ? ctx.t.talkStartingTitle : ctx.t.talkWorkingTitle}
        lead={api.busy ? ctx.t.buildingLead : isNew ? ctx.t.talkStartingLead : ctx.t.talkWorkingLead}
      >
        <Textarea
          className="min-h-[168px] resize-y leading-normal"
          placeholder={isNew ? ctx.t.talkStartingPlaceholder : ctx.t.talkWorkingPlaceholder}
          value={s.intro}
          onChange={(e) => api.set({ intro: e.target.value })}
          spellCheck={false}
          autoFocus
        />
        <ErrLine msg={api.error} />
        <Actions>
          <Button
            disabled={s.intro.trim().length < 50}
            onClick={() =>
              void api.run(
                async () => {
                  const { questions } = await ctx.build(s.intro, s.persona)
                  return { questions, answers: [], qi: 0 }
                },
                (n) => (n.questions.length ? 'probe' : 'answers'),
              )
            }
          >
            {ctx.t.buildCv}
          </Button>
        </Actions>
      </StepFrame>
    )
  },
}

// One backend question per screen. Next self-loops to the next question (which
// snapshots this one's answer, so Back walks the questions for free); the last
// question re-runs the build with the answers, then moves on.
const probe: Step<BuildState, BuildCtx> = {
  view: ({ api, ctx }) => {
    const s = api.state
    const last = s.qi >= s.questions.length - 1
    const provided = () => s.questions.map((q, i) => ({ q, a: s.answers[i] ?? '' })).filter((x) => x.a.trim().length > 0)
    const setAnswer = (v: string) => {
      const a = [...s.answers]
      a[s.qi] = v
      api.set({ answers: a })
    }
    const enrich = (qa: { q: string; a: string }[]) =>
      api.run(async () => {
        await ctx.build(s.intro, s.persona, qa)
        return {}
      }, 'answers')
    return (
      <StepFrame busy={api.busy} busyTitle={ctx.t.buildingTitle} lead={api.busy ? ctx.t.buildingLead : ctx.t.probeLead} title={ctx.t.probeTitle}>
        <div className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-faint">{s.qi + 1} / {s.questions.length}</div>
        <div className="mb-2.5 text-[15px] font-medium leading-snug">{s.questions[s.qi]}</div>
        <Textarea
          key={s.qi}
          className="min-h-[84px] resize-y leading-normal"
          value={s.answers[s.qi] ?? ''}
          onChange={(e) => setAnswer(e.target.value)}
          spellCheck
          autoFocus
        />
        <ErrLine msg={api.error} />
        <Actions>
          <Button onClick={() => (last ? void enrich(provided()) : api.goto('probe', { qi: s.qi + 1 }))}>
            {last ? ctx.t.buildCv : ctx.t.probeNext}
          </Button>
          <Button variant="link" onClick={() => { const p = provided(); if (p.length) void enrich(p); else api.goto('answers') }}>
            {ctx.t.skip}
          </Button>
        </Actions>
      </StepFrame>
    )
  },
}

const buildWizard = wizard<BuildState, BuildCtx>('persona', {
  persona,
  talk,
  probe,
  answers: answersStep<BuildState>(),
})

export function BuildWizard({ onDone }: { onDone: () => void }) {
  const [profile, saveProfile] = useStore('profile')
  const [settings] = useStore('settings')
  const t = useContent('onboarding')

  const ctx: BuildCtx = {
    t,
    finish: () => {
      // Went through the builder — set the durable flag so the Home CTA stops.
      void store.update('profile', markResumeHelpDone)
      onDone()
    },
    build: async (intro, persona, answers) => {
      const { profile: built, questions } = await runBuildProfile(settings, intro, persona, answers)
      // Spread the existing profile first so the AI rebuild keeps `onboarding`
      // (and anything else it doesn't return); overlay the built content + facts.
      saveProfile({ ...profile, ...built, facts: profile.facts })
      return { questions }
    },
  }

  const { view, canBack, busy, back } = useWizard(buildWizard, ctx, initBuild())
  return (
    <WizardShell canBack={canBack} disabled={busy} onBack={back} backLabel={t.back}>
      {view}
    </WizardShell>
  )
}
