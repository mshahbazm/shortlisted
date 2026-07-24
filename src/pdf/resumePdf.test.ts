// Smoke test: every template (all formats) renders to a structurally valid PDF
// from the sample profile — no throw, real %PDF bytes, non-trivial size. Guards
// the format renderers against regressions. Run: bun test src/pdf/resumePdf.test.ts

import { expect, test } from 'bun:test'

import { base64ToBytes } from '../lib/types'
import { masterVariant, renderResumePdf } from './resumePdf'
import { sampleProfile } from './sampleProfile'
import { TEMPLATES } from './templates'

const profile = sampleProfile()
const variant = masterVariant(profile)

for (const tpl of TEMPLATES) {
  test(`renders '${tpl.id}' to a valid PDF`, () => {
    const b64 = renderResumePdf(profile, variant, tpl.id)
    expect(b64.length).toBeGreaterThan(1000)
    const bytes = base64ToBytes(b64)
    const header = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])
    expect(header).toBe('%PDF')
  })
}
