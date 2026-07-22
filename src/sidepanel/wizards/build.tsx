// Wizard B — "Let's build your resume together". Shown when the user is logged
// in but has no profile yet (the App router decides that). Persona → free-form
// intro → a GATHER loop (each round the backend judges the material and returns
// the next questions, or "enough") → one EXTRACTION into a clean profile.
//
// The raw material lives server-side in the `intake` table, so the flow is
// exactly resumable: on open we fetch the in-progress session and drop the user
// back on the round they left. Nothing is written to the profile until the end.

import { useEffect, useMemo, useState } from 'react'

import { useContent } from '../../i18n'
import { useStore } from '../hooks'
import { BigChoice, Button, Textarea } from '../ui'
import { StepFrame, Actions, ErrLine, WizardShell, useWizard, wizard, type Step } from '../wizard'
import { intakeNext, loadIntakeSession, runBuildProfile } from '../../ai/run'
import { markResumeHelpDone, type Persona } from '../../lib/types'
import { cn } from '../../lib/cn'
import * as store from '../../lib/store'
import { WizCtx, answersStep, type OnbContent } from './steps'

interface BuildState {
  persona: Persona
  intro: string
  round: number // current round number (1-based); 0 before any questions
  questions: string[] // the current round's questions
  answers: string[] // parallel to questions
}
const initBuild = (): BuildState => ({ persona: 'working', intro: '', round: 0, questions: [], answers: [] })

// The intro needs a bit of substance before the AI has anything to shape into a
// CV. Show the count so the requirement isn't a mystery behind a dead button.
const MIN_INTRO = 50

interface BuildCtx extends WizCtx {
  /** Gather: send the intro (start) or a round's answers (continue); get the
   *  next questions or `enough`. */
  next: (body: { persona: Persona; intro: string; answers?: string[] }) => Promise<{ enough: boolean; questions: string[]; round: number }>
  /** Finalize: extract the profile from the gathered intake and save it. Pass the
   *  current answers to record them first (used on skip). */
  finalize: (answers?: string[]) => Promise<void>
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
    // Start the intake from the free-form intro. If there's already enough, skip
    // straight to extraction; otherwise walk the questions (`probe`).
    const start = () =>
      void api.run(
        async () => {
          const r = await ctx.next({ persona: s.persona, intro: s.intro })
          if (r.enough || !r.questions.length) {
            await ctx.finalize()
            return { questions: [], answers: [], round: r.round }
          }
          return { questions: r.questions, answers: r.questions.map(() => ''), round: r.round }
        },
        (n) => (n.questions.length ? 'probe' : 'answers'),
      )
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
        {(() => {
          const count = s.intro.trim().length
          const ready = count >= MIN_INTRO
          // Below the bar: a red count so the requirement isn't a mystery. Once
          // met: drop the number and nudge for more — the richer the dump, the
          // better the CV.
          return (
            <div className={cn('mt-1 text-right text-[11.5px]', ready ? 'text-good' : 'text-bad tabular-nums')}>
              {ready ? ctx.t.talkCountReady : ctx.t.talkCountNeed(count, MIN_INTRO)}
            </div>
          )
        })()}
        <ErrLine msg={api.error} />
        <Actions>
          <Button disabled={s.intro.trim().length < MIN_INTRO} onClick={start}>
            {ctx.t.buildCv}
          </Button>
        </Actions>
      </StepFrame>
    )
  },
}

// One round per screen: up to 3 questions shown together. Submitting sends the
// answers and either loops to the next round or finalizes; skip finalizes now.
const probe: Step<BuildState, BuildCtx> = {
  view: ({ api, ctx }) => {
    const s = api.state
    const setAnswer = (i: number, v: string) => {
      const a = [...s.answers]
      a[i] = v
      api.set({ answers: a })
    }
    const submit = () =>
      void api.run(
        async () => {
          const r = await ctx.next({ persona: s.persona, intro: s.intro, answers: s.answers })
          if (r.enough || !r.questions.length) {
            await ctx.finalize()
            return { questions: [], answers: [], round: r.round }
          }
          return { questions: r.questions, answers: r.questions.map(() => ''), round: r.round }
        },
        (n) => (n.questions.length ? 'probe' : 'answers'),
      )
    const skip = () => void api.run(async () => ctx.finalize(s.answers), 'answers')
    return (
      <StepFrame busy={api.busy} busyTitle={ctx.t.buildingTitle} lead={api.busy ? ctx.t.buildingLead : ctx.t.probeLead} title={ctx.t.probeTitle}>
        <div key={s.round} className="flex flex-col gap-3.5">
          {s.questions.map((q, i) => (
            <div key={i}>
              <div className="mb-1.5 text-[14px] font-medium leading-snug">{q}</div>
              <Textarea
                className="min-h-[64px] resize-y leading-normal"
                value={s.answers[i] ?? ''}
                onChange={(e) => setAnswer(i, e.target.value)}
                spellCheck
                autoFocus={i === 0}
              />
            </div>
          ))}
        </div>
        <ErrLine msg={api.error} />
        <Actions>
          <Button onClick={submit}>{ctx.t.probeNext}</Button>
          <Button variant="link" onClick={skip}>
            {ctx.t.skip}
          </Button>
        </Actions>
      </StepFrame>
    )
  },
}

const buildSteps = { persona, talk, probe, answers: answersStep<BuildState>() }
const makeBuildWizard = (entry: string) => wizard<BuildState, BuildCtx>(entry, buildSteps)

function BuildInner({ entry, init, onDone }: { entry: string; init: BuildState; onDone: () => void }) {
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
    next: (body) => intakeNext(settings, body),
    finalize: async (answers) => {
      const { profile: built } = await runBuildProfile(settings, answers)
      // Spread the existing profile first so the AI build keeps `onboarding`
      // (and anything else it doesn't return); overlay the built content, and
      // keep the existing facts (the job-prefs step owns those).
      saveProfile({ ...profile, ...built, facts: profile.facts })
    },
  }

  const wz = useMemo(() => makeBuildWizard(entry), [entry])
  const { view, canBack, busy, back } = useWizard(wz, ctx, init)
  return (
    <WizardShell canBack={canBack} disabled={busy} onBack={back} backLabel={t.back}>
      {view}
    </WizardShell>
  )
}

export function BuildWizard({ onDone }: { onDone: () => void }) {
  const [settings] = useStore('settings')
  const t = useContent('onboarding')
  // Resume: fetch any in-progress intake before mounting the wizard so we can
  // start on the right step. Falls back to a fresh start on any error.
  const [boot, setBoot] = useState<{ entry: string; init: BuildState } | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const session = await loadIntakeSession(settings)
        if (!alive) return
        if (session && session.status === 'gathering' && session.rounds.length) {
          const cur = session.rounds[session.rounds.length - 1]
          setBoot({
            entry: 'probe',
            init: {
              persona: session.persona,
              intro: session.intro,
              round: session.rounds.length,
              questions: cur.questions,
              answers: cur.answers.length ? cur.answers.slice() : cur.questions.map(() => ''),
            },
          })
        } else {
          setBoot({ entry: 'persona', init: initBuild() })
        }
      } catch {
        if (alive) setBoot({ entry: 'persona', init: initBuild() })
      }
    })()
    return () => {
      alive = false
    }
  }, [settings])

  if (!boot) {
    return (
      <WizardShell canBack={false} disabled onBack={() => {}} backLabel={t.back}>
        <StepFrame busy busyTitle={t.buildingTitle} title={t.buildTitle} lead={t.buildingLead} />
      </WizardShell>
    )
  }
  return <BuildInner entry={boot.entry} init={boot.init} onDone={onDone} />
}
