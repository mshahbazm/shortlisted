import { defineManifest } from '@crxjs/vite-plugin'

// ATS domains we ship precise adapters for. Everything else is covered by the
// generic engine, injected on demand after the user grants permission.
export const ATS_MATCHES = [
  'https://boards.greenhouse.io/*',
  'https://job-boards.greenhouse.io/*',
  'https://jobs.lever.co/*',
  'https://jobs.ashbyhq.com/*',
  'https://apply.workable.com/*',
  'https://*.bamboohr.com/*',
  'https://*.breezy.hr/*',
  'https://*.recruitee.com/*',
  'https://jobs.smartrecruiters.com/*',
]

export default defineManifest({
  manifest_version: 3,
  name: 'Shortlisted — job application copilot',
  version: '0.1.0',
  description:
    'Fills job applications from your profile, learns every new question, and tailors truthful CV versions. You review and click submit.',
  action: {
    default_title: 'Shortlisted',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  content_scripts: [
    {
      matches: ATS_MATCHES,
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
      all_frames: true,
    },
  ],
  permissions: ['storage', 'unlimitedStorage', 'sidePanel', 'notifications', 'scripting', 'tabs'],
  host_permissions: [
    ...ATS_MATCHES,
    // BYOK AI calls go straight from the extension to the provider.
    'https://api.anthropic.com/*',
    'https://api.openai.com/*',
    // Shortlisted Cloud (production origin; dev uses localhost below).
    'https://shortlist.id/*',
    // Ollama + the local job-finder app (match patterns ignore ports).
    'http://localhost/*',
    'http://127.0.0.1/*',
  ],
  // "Fill this page" on any other career site asks for this at click time.
  optional_host_permissions: ['<all_urls>'],
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
})
