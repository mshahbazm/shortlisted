// Dev tool: render a sample CV for each FORMAT to sample-cvs/*.pdf so we can open
// them and compare against a real Europass / Lebenslauf downloaded from the web.
//   bun run scripts/render-samples.ts
// Picks one representative template per format. Output dir is gitignored.

import { masterVariant, renderResumePdf } from '../src/pdf/resumePdf'
import { sampleProfile } from '../src/pdf/sampleProfile'
import { FORMATS, TEMPLATES, templateFormat } from '../src/pdf/templates'
import { base64ToBytes } from '../src/lib/types'

const profile = sampleProfile()
const variant = masterVariant(profile)

const outDir = 'sample-cvs'
for (const fmt of FORMATS) {
  const tpl = TEMPLATES.find((t) => templateFormat(t) === fmt.id)
  if (!tpl) {
    console.log(`(no template yet for format '${fmt.id}')`)
    continue
  }
  const b64 = renderResumePdf(profile, variant, tpl.id)
  const path = `${outDir}/${fmt.id}-${tpl.id}.pdf`
  await Bun.write(path, base64ToBytes(b64))
  console.log(`wrote ${path}`)
}

console.log('Done. Open the PDFs in sample-cvs/ to compare against real examples.')
