import { defineManifest } from '@crxjs/vite-plugin'

// ATS domains we ship precise adapters for — exact form roots, submit
// selectors and quirks. Every other site is handled by the generic engine,
// which the detector (content/detect.ts) points at the right pages.
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
  // The content script runs on every page so it can RECOGNISE a job
  // application anywhere, not only on the platforms we ship adapters for.
  // Recognising is all it does uninvited: content/detect.ts scores the page
  // locally and the overlay mounts only on a confident score. No page content
  // leaves the browser unless the user asks us to act on it.
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
      all_frames: true,
    },
  ],
  // No 'notifications' — nothing uses chrome.notifications, and every
  // permission listed here costs a line in the install dialog.
  permissions: ['storage', 'unlimitedStorage', 'sidePanel', 'scripting', 'tabs'],
  // Covers every page above plus the API origins we call. Needed as a
  // permission, not just a content-script match, so the service worker can
  // inject into a tab that was already open when the extension loaded.
  host_permissions: ['<all_urls>'],
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
})
