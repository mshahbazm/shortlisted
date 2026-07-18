# Shortlisted — job application copilot (Chrome extension)

Fills job applications from your profile, learns every new question, and tailors
truthful CV versions. You review and click submit. See `SPEC.md` for the full spec.

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

## Shortlisted Cloud (hosted AI backend)

`server/` is the hosted tier: same capability code as the extension, but the AI
key lives server-side so users need zero setup. Stores usage counts only —
never CVs, profiles, or job text (check the schema in `server/src/db.ts`).

```bash
cd server && bun install
LLM_PROVIDER=anthropic LLM_KEY=sk-ant-… bun run dev     # real AI on :8788
LLM_PROVIDER=mock bun run dev                            # no key, canned outputs
```

Env: `LLM_PROVIDER` (anthropic|openai|mock), `LLM_KEY`, `LLM_MODEL` (default
claude-sonnet-5, used for the writing pass), `LLM_MINI_MODEL` (cheap model for
extract/match passes), `FREE_CREDITS` (10), `PRO_CREDITS` (100/mo),
`LICENSE_KEYS` (comma-separated Pro keys until a merchant-of-record is wired),
`PORT` (8788), `DB_PATH`.

In the extension: Settings → AI → "Shortlisted Cloud". A device token is
provisioned automatically; free credits, then a license key unlocks Pro.

## Layout

- `src/content/` — ATS detection (`adapters.ts`), fill engine (`engine.ts`,
  `fields.ts`, `profileMap.ts`), on-page overlay (`overlay.ts`).
- `src/ai/` — `systemAgent.ts` (one wrapper for every AI call, schema-in-prompt +
  repair parse + validate/retry), `capabilities/tailor-cv/` and
  `capabilities/extract-profile/` (each: prompt / schema / index).
- `src/pdf/resumePdf.ts` — profile JSON → simple single-column ATS-safe PDF.
- `src/sidepanel/` — React UI (Profile, CVs, Queue, Questions, Applied, Settings).
- `src/background/` — message routing, pending-questions badge, on-demand injection.
