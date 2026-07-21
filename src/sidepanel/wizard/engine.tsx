// A tiny declarative wizard engine for the side panel — the frontend cousin of
// the cloud's step-based workflow engine (src/workflow on the server).
//
// Same philosophy: a wizard is DATA (a map of steps + their edges), state is a
// reducer of patches (`state = {...state, ...patch}`), the runner is dumb and
// the steps are smart. What the cloud engine can't do — because it runs to
// completion with no human — this adds:
//
//   - render a step and WAIT for input (each step is a view)
//   - BRANCH on user choice (`goto(id)`, or a conditional `next`)
//   - BACK that follows the real path: history is a stack of state SNAPSHOTS, so
//     `back()` restores the frame *before* a step's writes. Downstream state is
//     discarded for free, and a self-loop (the one-question-per-screen probe) is
//     just `goto` to your own id — branches, forks and loops share one code path.
//   - per-step ASYNC with busy/error (`run`) and per-step VALIDATION (reject and
//     stay, non-fatal).
//
// The transition core (initWizard / commit / patchState / goBack) is pure and
// unit-tested; `useWizard` is a thin React wrapper over it. Steps live in
// ../wizards, chrome in ./shell.

import { ReactNode, useRef, useState } from 'react'

/** Ambient services every step gets. A wizard extends this with its own (async
 *  runners, saved profile, a `done` callback…). `t` is the i18n bundle. */
export interface BaseCtx {
  t: unknown
}

export type NavOpts = { reset?: boolean }
/** Where to land: a fixed step id, or a function of the (already-merged) state. */
export type To<S> = string | ((state: S) => string)

/** What a step's view receives. Every write goes through here — a step never
 *  mutates state directly, exactly like a cloud step returning a patch. */
export interface StepApi<S> {
  readonly state: S
  /** Merge a patch and STAY on the step (field edits). No history snapshot. */
  set(patch: Partial<S>): void
  /** Merge an optional patch, then advance along `step.next`. Snapshots. */
  next(patch?: Partial<S>): void
  /** Jump to an explicit step (branch or self-loop). `reset` clears history so
   *  you can't `back` into it (post-auth, transient screens). Snapshots. */
  goto(id: string, patch?: Partial<S>, opts?: NavOpts): void
  /** Pop the snapshot stack: restore the previous frame, state and all. */
  back(): void
  readonly busy: boolean
  readonly error: string
  /** Run async work: busy on, catch → error, busy off, merge the returned patch,
   *  and (if `to` given) advance to it — the one place spinner/try-catch lives.
   *  `opts.reset` clears history on the advance (post-auth: no back into OTP). */
  run(fn: () => Promise<Partial<S> | void>, to?: To<S>, opts?: NavOpts): Promise<void>
}

export interface Step<S, C extends BaseCtx = BaseCtx> {
  /** Forward edge for `next()` — a fixed id or a function of state. */
  readonly next?: To<S>
  /** Reject the user's input and stay put: return a message, or nothing to pass. */
  readonly validate?: (state: S, ctx: C) => string | void
  /** The step's UI. A plain render function; may use hooks (it's called inside a
   *  host component keyed by step id, so hooks stay consistent per step). */
  readonly view: (props: { api: StepApi<S>; ctx: C }) => ReactNode
}

export interface Wizard<S, C extends BaseCtx = BaseCtx> {
  readonly initial: string
  readonly steps: Record<string, Step<S, C>>
}

/** Assemble a wizard from its entry id and step map (like the cloud's workflow()). */
export function wizard<S, C extends BaseCtx = BaseCtx>(
  initial: string,
  steps: Record<string, Step<S, C>>,
): Wizard<S, C> {
  return { initial, steps }
}

// ---------- pure transition core (no React) ----------

interface Frame<S> {
  step: string
  state: S
}

/** The whole wizard position: current frame, the snapshot stack, and any error. */
export interface WState<S> {
  step: string
  state: S
  history: Frame<S>[]
  error: string
}

const resolve = <S,>(to: To<S>, state: S): string => (typeof to === 'function' ? to(state) : to)

export function initWizard<S, C extends BaseCtx>(wz: Wizard<S, C>, initial: S): WState<S> {
  return { step: wz.initial, state: initial, history: [], error: '' }
}

/** Advance to `id`: merge the patch, validate the step we're LEAVING, and on
 *  pass snapshot the departed frame (unless `reset`). On a validate failure,
 *  stay put with the error — the just-typed value is preserved via prior set()s. */
export function commit<S, C extends BaseCtx>(
  wz: Wizard<S, C>,
  ctx: C,
  ws: WState<S>,
  id: string,
  patch: Partial<S>,
  opts?: NavOpts,
): WState<S> {
  const state = { ...ws.state, ...patch }
  const guard = wz.steps[ws.step].validate?.(state, ctx)
  if (guard) return { ...ws, error: guard }
  return {
    step: id,
    state,
    error: '',
    history: opts?.reset ? [] : [...ws.history, { step: ws.step, state: ws.state }],
  }
}

/** Field edit: merge and stay, no snapshot, error untouched. */
export function patchState<S>(ws: WState<S>, patch: Partial<S>): WState<S> {
  return { ...ws, state: { ...ws.state, ...patch } }
}

/** Restore the previous frame (state and all); no-op at the root. */
export function goBack<S>(ws: WState<S>): WState<S> {
  const prev = ws.history[ws.history.length - 1]
  if (!prev) return { ...ws, error: '' }
  return { step: prev.step, state: prev.state, history: ws.history.slice(0, -1), error: '' }
}

// ---------- React wrapper ----------

export interface WizardHandle {
  view: ReactNode
  canBack: boolean
  busy: boolean
  back(): void
}

/** Hosts one step. Keyed by step id upstream, so changing steps remounts it
 *  (autofocus / inner refs reset); a self-loop keeps the same id and doesn't. */
function StepHost<S, C extends BaseCtx>(props: {
  render: (p: { api: StepApi<S>; ctx: C }) => ReactNode
  api: StepApi<S>
  ctx: C
}) {
  return <>{props.render({ api: props.api, ctx: props.ctx })}</>
}

export function useWizard<S, C extends BaseCtx>(wz: Wizard<S, C>, ctx: C, initial: S): WizardHandle {
  const [ws, setWs] = useState<WState<S>>(() => initWizard(wz, initial))
  const [busy, setBusy] = useState(false)
  // Async callbacks and same-tick set()+next() need the freshest state, not the
  // one captured at render — mirror it into a ref updated eagerly on every write.
  const live = useRef(ws)
  live.current = ws
  const apply = (next: WState<S>) => {
    live.current = next
    setWs(next)
  }

  const step = wz.steps[ws.step]
  const back = () => apply(goBack(live.current))
  const api: StepApi<S> = {
    state: ws.state,
    busy,
    error: ws.error,
    set: (patch) => apply(patchState(live.current, patch)),
    next: (patch = {}) => {
      const to = step.next
      if (to == null) return
      apply(commit(wz, ctx, live.current, resolve(to, { ...live.current.state, ...patch }), patch))
    },
    goto: (id, patch = {}, opts) => apply(commit(wz, ctx, live.current, id, patch, opts)),
    back,
    run: async (fn, to, opts) => {
      apply({ ...live.current, error: '' })
      setBusy(true)
      try {
        const patch = ((await fn()) ?? {}) as Partial<S>
        if (to !== undefined) apply(commit(wz, ctx, live.current, resolve(to, { ...live.current.state, ...patch }), patch, opts))
        else apply(patchState(live.current, patch))
      } catch (e) {
        apply({ ...live.current, error: e instanceof Error ? e.message : String(e) })
      } finally {
        setBusy(false)
      }
    },
  }

  return {
    view: <StepHost<S, C> key={ws.step} render={step.view} api={api} ctx={ctx} />,
    canBack: ws.history.length > 0,
    busy,
    back,
  }
}
