# Shortlisted — job application copilot (Chrome extension)

**[shortlist.id](https://shortlist.id)** · Fills job applications from your profile,
learns every new question, and tailors truthful CV versions. You review and click
submit.

## Try it (V1)

```bash
bun install
bun run build        # outputs to dist/
```

1. Open `chrome://extensions`, turn on **Developer mode** (top right).
2. **Load unpacked** → pick the `dist/` folder.
3. Click the Shortlisted icon — the side panel opens.

### First 5 minutes

1. **Settings tab** — pick an AI provider and paste your key (optional; filling
   works without AI, but profile import + CV tailoring need it).
2. **Profile tab** — "Paste CV text → build profile with AI", or fill it by hand.
   Fill the "Standard answers" card (salary, notice period, work authorization…) —
   those are asked on almost every application.
3. **CVs tab** — "Generate from profile" for the master CV, or upload PDFs you
   already have. "Paste a job → tailored CV" makes an honest variant for one job.
4. Open any job on Greenhouse / Lever / Ashby / Workable / BambooHR / Breezy /
   Recruitee / SmartRecruiters — a small **Shortlisted panel** appears bottom-right.
   Click **Fill this application**.
5. Whatever it can't answer shows in the panel — type the answer once, it's saved
   to your bank and reused on every future application that asks the same thing
   (any phrasing).
6. **Queue tab** — paste a list of job links (or pull from the finder on
   localhost:4322) and work through them: Open next → fill → review → submit → next.
   "Fill current tab" works on any other career site after a one-time permission.

### Dev loop

```bash
bun run dev          # CRXJS HMR — reload the extension once, then edits hot-reload
```

## Rules this codebase lives by

- No auto-submit, ever. No CAPTCHA touching. Human clicks submit.
- The CV tailor may reorder/rephrase only what the profile really contains —
  work entries are rebuilt from the profile by `sourceId`, skills must be a
  subset, so invented experience is structurally impossible.
- All data in `chrome.storage.local`. BYOK AI calls go extension → provider directly.

## Shortlisted Cloud

The optional hosted AI tier ("no key needed") lives in a separate private repo
that consumes this repo as a git submodule — the agent capabilities you see
here are exactly what runs there. This extension is fully functional without
it: bring your own key or a local model, forever free.
In the extension: Settings → AI → "Shortlisted Cloud" (device token
auto-provisioned; 10 free credits, license key unlocks Pro). Cloud, profile
pages, and everything else live at [shortlist.id](https://shortlist.id).

## License

AGPL-3.0 — read it, verify it, fork it; if you offer a modified version as a
service, your changes must be open too.

## Layout

- `src/content/` — ATS detection (`adapters.ts`), fill engine (`engine.ts`,
  `fields.ts`, `profileMap.ts`), on-page overlay (`overlay.ts`).
- `src/ai/` — `systemAgent.ts` (one wrapper for every AI call, schema-in-prompt +
  repair parse + validate/retry), `capabilities/tailor-cv/` and
  `capabilities/extract-profile/` (each: prompt / schema / index).
- `src/pdf/resumePdf.ts` — profile JSON → simple single-column ATS-safe PDF.
- `src/sidepanel/` — React UI (Profile, CVs, Queue, Questions, Applied, Settings).
- `src/background/` — message routing, pending-questions badge, on-demand injection.
