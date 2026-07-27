// The no-CV builder's extraction step. Runs ONCE, at the end: it takes the full
// guided-Q&A transcript gathered in the `intake` table and produces the structured
// profile. Gathering and questioning is the assessor's job (assess.ts); this file
// only extracts.
//
// The raw material is NOT written onto the profile — it lives in the `intake`
// table, so the profile holds only finished, structured content and stays clean.

import type { LlmClient } from '../../systemAgent'
import type { Profile, ProfileIntent } from '../../../lib/types'
import { runWorkflow, step, workflow, type BaseCtx } from '../../../workflow'
import { extractFreeform } from './extract-freeform'

export interface AiCtx extends BaseCtx {
  llm: LlmClient
}

export interface BuildProfileState {
  transcript: string
  /** Which document we're building. Defaults to `hired` — every prompt written
   *  before the fork existed assumes a résumé, so legacy callers are unchanged. */
  intent?: ProfileIntent
  profile?: Profile
}

// One step, one job: transcript -> structured Profile. Kept as a workflow (house
// convention) so future steps (e.g. a positioning polish) can slot in cleanly.
const extractBase = step<BuildProfileState, AiCtx>('extract-base', async (ctx, s) => {
  const profile = await extractFreeform(ctx.llm, s.transcript, s.intent)
  return { profile }
})

export const buildProfileWorkflow = workflow<BuildProfileState, AiCtx>('build-profile', [extractBase])

export function runBuildProfile(ctx: AiCtx, transcript: string, intent?: ProfileIntent): Promise<BuildProfileState> {
  return runWorkflow(buildProfileWorkflow, ctx, { transcript, intent })
}
