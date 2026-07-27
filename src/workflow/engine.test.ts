import { describe, expect, test } from 'bun:test'

import { parallel, runWorkflow, step, workflow } from './engine'
import type { BaseCtx } from './types'

type S = { a?: number; b?: number }

describe('workflow engine', () => {
  test('runs steps sequentially, merging each patch into state', async () => {
    const wf = workflow<S>('seq', [
      step('one', async () => ({ a: 1 })),
      step('two', async (_ctx, s) => ({ b: (s.a ?? 0) + 1 })),
    ])
    expect(await runWorkflow(wf, {}, {})).toEqual({ a: 1, b: 2 })
  })

  test('parallel runs children concurrently and merges disjoint keys', async () => {
    let live = 0
    let peak = 0
    const slow = (key: 'a' | 'b', v: number) =>
      step<S>(key, async () => {
        live++
        peak = Math.max(peak, live)
        await new Promise((r) => setTimeout(r, 20))
        live--
        return { [key]: v }
      })
    const wf = workflow<S>('par', [parallel('both', [slow('a', 1), slow('b', 2)])])
    expect(await runWorkflow(wf, {}, {})).toEqual({ a: 1, b: 2 })
    expect(peak).toBe(2) // both were in flight at the same time
  })

  test('needs no model — a pure workflow runs with a bare context', async () => {
    const wf = workflow<S>('pure', [step('double', async (_c, s) => ({ a: (s.a ?? 2) * 2 }))])
    expect((await runWorkflow(wf, {}, { a: 3 })).a).toBe(6)
  })

  test('emits a ▶/✓ log line per step when a logger is given', async () => {
    const lines: string[] = []
    const ctx: BaseCtx = { log: (m) => lines.push(m) }
    await runWorkflow(workflow<S>('logged', [step('s1', async () => ({ a: 1 }))]), ctx, {})
    expect(lines.some((l) => l.startsWith('▶ logged/s1'))).toBe(true)
    expect(lines.some((l) => l.startsWith('✓ logged/s1'))).toBe(true)
  })

  test('aborts before running the next step', async () => {
    const ac = new AbortController()
    const wf = workflow<S>('cancel', [
      step('first', async () => { ac.abort(); return { a: 1 } }),
      step('second', async () => ({ b: 2 })),
    ])
    await expect(runWorkflow(wf, { signal: ac.signal }, {})).rejects.toThrow()
  })
})
