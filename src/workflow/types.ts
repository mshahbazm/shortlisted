// Generic step-based workflow engine for server work. Deliberately LLM-agnostic:
// a step MAY use a model (via a context that carries one), but sequence,
// parallel and state-merge have nothing to do with AI — so plenty of workflows
// and steps run with no model at all.

export interface BaseCtx {
  /** Optional progress line — the engine emits ▶/✓ per step when present. */
  log?: (msg: string) => void
  /** Cooperative cancellation, checked between steps. */
  signal?: AbortSignal
}

/** A unit of work: read the shared state, do something, return a patch to merge. */
export interface Step<S, C extends BaseCtx = BaseCtx> {
  readonly name: string
  run(ctx: C, state: S): Promise<Partial<S>>
}

/** An ordered list of steps over one typed state shape. */
export interface Workflow<S, C extends BaseCtx = BaseCtx> {
  readonly name: string
  readonly steps: Step<S, C>[]
}
