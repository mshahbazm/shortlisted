// Builds an LlmClient from extension Settings (BYOK / local models).
// The cloud provider doesn't use this — cloud runs whole capabilities
// server-side (see run.ts).

import { Settings } from '../lib/types'
import { LlmClient } from './systemAgent'
import { complete } from './providers'

export function clientFromSettings(settings: Settings): LlmClient {
  return (req) => complete(settings, req)
}
