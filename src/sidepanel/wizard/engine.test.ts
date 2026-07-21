// The wizard engine's transition core is pure (no React), so these drive it
// directly. They lock the properties the old hand-rolled state machine kept
// getting wrong: back that restores prior STATE (not just the step id), the
// self-looping probe, discarding downstream writes, and reject-and-stay validation.
//
// Run: bun test

import { expect, test, describe } from 'bun:test'
import { wizard, initWizard, commit, patchState, goBack, type Step, type WState, type BaseCtx } from './engine'

type S = { a: number; b: string; qi: number; answers: string[] }
const ctx: BaseCtx = { t: {} }
const noView: Step<S>['view'] = () => null

const wz = wizard<S>('one', {
  one: { next: 'two', view: noView },
  two: { next: (s) => (s.a > 0 ? 'pos' : 'neg'), view: noView },
  pos: { view: noView },
  neg: { view: noView },
  email: { next: 'done', validate: (s) => (s.b.includes('@') ? undefined : 'bad email'), view: noView },
  done: { view: noView },
  probe: { view: noView },
})
const start = (): WState<S> => initWizard(wz, { a: 0, b: '', qi: 0, answers: [] })

describe('commit / next', () => {
  test('merges a patch and advances', () => {
    const ws = commit(wz, ctx, start(), 'two', { a: 5 })
    expect(ws.step).toBe('two')
    expect(ws.state.a).toBe(5)
    expect(ws.history.map((f) => f.step)).toEqual(['one'])
  })

  test('a conditional edge picks the branch from the merged state', () => {
    const ws = commit(wz, ctx, start(), 'two', { a: 5 })
    const edge = wz.steps.two.next as (s: S) => string
    expect(edge(ws.state)).toBe('pos')
    expect(edge({ ...ws.state, a: 0 })).toBe('neg')
  })
})

describe('goBack (snapshot history)', () => {
  test('restores the previous frame AND its state', () => {
    const s2 = commit(wz, ctx, start(), 'two', { a: 5 })
    const s3 = commit(wz, ctx, s2, 'pos', { a: 9 })
    const back = goBack(s3)
    expect(back.step).toBe('two')
    expect(back.state.a).toBe(5) // the a:9 written on 'pos' is discarded
  })

  test('discards a step downstream writes when you back past it', () => {
    let ws = commit(wz, ctx, start(), 'two', { a: 1 })
    ws = patchState(ws, { b: 'typed on two' })
    const back = goBack(ws)
    expect(back.step).toBe('one')
    expect(back.state.b).toBe('') // gone — the whole prior frame is restored
  })

  test('self-loop back restores the prior question and its answer', () => {
    let ws = commit(wz, ctx, start(), 'probe', {}) // enter probe at qi:0
    ws = patchState(ws, { answers: ['first'] })
    ws = commit(wz, ctx, ws, 'probe', { qi: 1 }) // self-loop to qi:1, snapshots qi:0+answer
    ws = patchState(ws, { answers: ['first', 'second'] })
    const back = goBack(ws)
    expect(back.step).toBe('probe')
    expect(back.state.qi).toBe(0)
    expect(back.state.answers).toEqual(['first']) // qi:1's answer discarded, qi:0 intact
  })

  test('is a no-op at the root', () => {
    const ws = start()
    expect(goBack(ws)).toEqual(ws)
  })
})

describe('validate', () => {
  const emailWs = (b: string): WState<S> => ({ step: 'email', state: { a: 0, b, qi: 0, answers: [] }, history: [], error: '' })

  test('reject: stays on the step, sets the error, keeps the typed value', () => {
    const r = commit(wz, ctx, emailWs('nope'), 'done', {})
    expect(r.step).toBe('email')
    expect(r.error).toBe('bad email')
    expect(r.state.b).toBe('nope')
    expect(r.history).toEqual([]) // no snapshot on a rejected move
  })

  test('pass: advances and clears the error', () => {
    const r = commit(wz, ctx, { ...emailWs('me@x.co'), error: 'stale' }, 'done', {})
    expect(r.step).toBe('done')
    expect(r.error).toBe('')
  })
})

describe('reset', () => {
  test('clears history so back cannot re-enter (post-auth / transient)', () => {
    let ws = commit(wz, ctx, start(), 'two', {})
    ws = commit(wz, ctx, ws, 'done', {}, { reset: true })
    expect(ws.history).toEqual([])
    expect(goBack(ws).step).toBe('done')
  })
})

describe('async advance (run success path)', () => {
  test('an async result can branch on the merged state', () => {
    // emulates run(fn, to): fn resolved { qi: 2 }, to = s => s.qi ? 'probe' : 'done'
    const patch = { qi: 2 }
    const merged = { ...start().state, ...patch }
    const to = (s: S) => (s.qi ? 'probe' : 'done')
    const ws = commit(wz, ctx, start(), to(merged), patch)
    expect(ws.step).toBe('probe')
    expect(ws.state.qi).toBe(2)
  })
})
