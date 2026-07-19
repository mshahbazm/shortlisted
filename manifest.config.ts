import { defineManifest } from '@crxjs/vite-plugin'

// The ATS platforms we ship precise adapters for are listed in
// content/adapters.ts, which matches on hostname at runtime. The manifest no
// longer needs that list: the content script runs everywhere and the detector
// decides, so there is nothing here to keep in step with it.

export default defineManifest(({ mode }) => ({
  manifest_version: 3,
  // A dev build says so in its name. Both builds can be loaded unpacked side
  // by side, and chrome://extensions, the toolbar and the side panel all show
  // which one you are actually looking at — the thing that is invisible when
  // the only difference is which server the code talks to.
  name: mode === 'production' ? 'Shortlisted — job application copilot' : 'Shortlisted (dev) — local server',
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
}))
