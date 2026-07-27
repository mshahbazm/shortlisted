import type { BaseCtx, Step, Workflow } from './types'

/** Define a step. */
export function step<S, C extends BaseCtx = BaseCtx>(
  name: string,
  run: (ctx: C, state: S) => Promise<Partial<S>>,
): Step<S, C> {
  return { name, run }
}

/**
 * ONE logical step that runs its children concurrently over the SAME input
 * state and merges their patches. This is how "two parallel steps" become a
 * single step. Children must write disjoint keys (last write wins otherwise).
 */
export function parallel<S, C extends BaseCtx = BaseCtx>(name: string, steps: Step<S, C>[]): Step<S, C> {
  return {
    name,
    async run(ctx, state) {
      const patches = await Promise.all(steps.map((s) => runStep(s, ctx, state, name)))
      return Object.assign({}, ...patches) as Partial<S>
    },
  }
}

/** Compose steps into a named workflow. */
export function workflow<S, C extends BaseCtx = BaseCtx>(name: string, steps: Step<S, C>[]): Workflow<S, C> {
  return { name, steps }
}

/** Run a workflow: reduce its steps over the state, sequentially, awaiting each. */
export async function runWorkflow<S, C extends BaseCtx>(wf: Workflow<S, C>, ctx: C, initial: S): Promise<S> {
  let state = initial
  for (const s of wf.steps) {
    ctx.signal?.throwIfAborted()
    state = { ...state, ...(await runStep(s, ctx, state, wf.name)) }
  }
  return state
}

async function runStep<S, C extends BaseCtx>(s: Step<S, C>, ctx: C, state: S, scope: string): Promise<Partial<S>> {
  const label = `${scope}/${s.name}`
  const t0 = Date.now()
  ctx.log?.(`▶ ${label}`)
  const patch = await s.run(ctx, state)
  ctx.log?.(`✓ ${label} (${Date.now() - t0}ms)`)
  return patch
}
