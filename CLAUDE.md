# Shortlisted extension — start here

A Manifest V3 Chrome extension: fills job applications from the user's profile,
learns every new question, and tailors truthful CV versions. **The user always
reviews and clicks submit.**

Public repo (AGPL). **Never commit business/strategy/pricing/personal content**,
and keep commit messages technical. The full product spec is in `SPEC.md` — a
gitignored symlink into a private repo, present only if that repo is checked out
alongside this one.

Several agents work this repo — you'll see changes you didn't make. Track what
*you* edited; stage files explicitly, never `git add -A`.

## Build & test
- `bun run dev` — Vite HMR.
- `bun run build:dev` — dev build → `dist/`; load it unpacked in Chrome.
- `bun run build` — `tsc --noEmit` + `bun test` + prod build → `dist-prod/`.
- Tests are `bun test` (happy-dom), on the deterministic risk areas (`detect`,
  `fields`, `combobox`, `profileMerge`, `config`). Run `tsc --noEmit` and
  `bun test` before calling anything done.

## Three surfaces (Vite + `@crxjs/vite-plugin`; typed manifest in `manifest.config.ts`)
- **Background** service worker (`src/background/`) — the message hub. Opens the
  side panel **synchronously** (the user-gesture token dies at the first
  `await`) and mirrors local data to the cloud (`cloudMirror.ts`).
- **Content script** (`src/content/`, entry `index.ts`) — runs on every page and
  frame at `document_idle`. Scores a page locally (`detect.ts`) and mounts the
  on-page overlay ONLY on a confident score. Nothing leaves the browser unless
  the user acts.
- **Side panel** (`src/sidepanel/`, entry `main.tsx` → `index.html`) — the React
  UI: `App.tsx`, `tabs/`, the owned `ui.tsx` kit.

## Discipline — everything goes through its layer
- **Storage → `lib/store.ts` only.** Typed `StorageShape`; `get`/`set`/`update`/
  `onChange`/`getAll`; older data migrates transparently on read
  (`normalizeProfile`/`normalizeSettings`). Don't touch `chrome.storage`
  directly — the `useStore` hook and the background `onChanged` listener are the
  only exceptions.
- **Cross-context messages → the typed `Msg` union in `lib/messaging.ts`.** Send
  with `sendMsg`; receive only in the background/content entry points. No ad-hoc
  message shapes.
- **AI / network → `ai/run.ts`** (`cloud*` fns hitting the cloud `/v1` API). No
  raw `fetch` anywhere else. The extension holds **no provider keys or models**
  and **no capability logic** — all AI runs on the cloud. This repo keeps only
  the result types the UI renders (`ai/contract.ts`) and the wire data model
  (`lib/types.ts`); the cloud has its own copies, kept in sync by hand.
- **Data model → `lib/types.ts`.** Stored data is versioned and migrated on
  read — extend the normalizer, never write a destructive migration.
- **Cloud sync → `background/cloudMirror.ts`.** Outbox + `knownIds` persist in
  `storage.sync` and retry via `chrome.alarms`, so an evicted worker loses
  nothing; deletes are sent explicitly (diffed vs `knownIds`) — the server never
  delete-by-absence, so a second device can't wipe rows it hasn't seen.

## Content engine (`src/content/`)
Small pieces over one shared engine — keep them small:
- `adapters.ts` — one per ATS: a tiny config (where the form is, how to spot the
  submit button). The script runs everywhere and the detector decides, so the
  manifest carries no site list.
- `detect.ts` — scores an unknown page as an application form (unprompted mount).
- `fields.ts` — field discovery + native value setting that works on
  React/Vue-controlled inputs (Greenhouse/Ashby/Workable are SPAs).
- `combobox.ts` — custom dropdowns that look like a `<select>` to a person and
  like nothing to the DOM.
- `profileMap.ts` — deterministic label → profile value (~80% of fields, no AI).
- `engine.ts` — fill orchestration. `overlay.ts` — the shadow-root panel.
- `i18n-bridge.ts` — locale strings for the content bundle, deliberately apart
  from the side panel so **React never enters this bundle**.

## Side panel UI
- **Owned components** (`sidepanel/ui.tsx`, shadcn-style — we own the source),
  built on **Base UI** (`@base-ui-components/react`), **not Radix**, and only
  where accessibility is genuinely hard (Dialog / Select / Popover). `cn()`
  (`lib/cn.ts`) = clsx + tailwind-merge, so a caller's override wins.
- Live storage views via the `useStore` hook (`sidepanel/hooks.ts`).

## Styling — load-bearing, do not break
- **Tailwind v4, CSS-first:** the palette is an `@theme` block in
  `sidepanel/styles.css` — there is no `tailwind.config.js`. **Don't hand-write
  CSS classes** — reach for a utility or a component. Keep `styles.css` small.
- **Tailwind must NEVER reach a page we fill.** Safe only because `styles.css` is
  imported by `sidepanel/main.tsx` alone, and the on-page overlay renders into a
  **closed shadow root** with its own injected `<style>` (`overlay.ts`). Break
  either and preflight starts resetting a stranger's careers page.
- The panel is ~400px and user-draggable — device breakpoints are useless; use
  content-driven ones (`min-[440px]:`).

## i18n
- Typed, 8 locales under `src/i18n/locales/<locale>/`; English is canonical, so a
  missing/mistyped key fails typecheck. **Never hardcode user-facing strings.**
  Side panel: `useContent`. Content script: `content/i18n-bridge.ts` (no React).

## Manifest & permissions
- Every permission costs a line in the install dialog — don't add one nothing
  uses. The manifest is typed (`manifest.config.ts`); dev and prod builds carry
  different names so you can tell which server the loaded build talks to.

## Hard rules
- **The user always clicks submit.** No auto-submit, no CAPTCHA solving, no
  mass-apply.
- CV tailoring **never invents** — truth is enforced inside the capability.
- Plain spoken English in anything user-facing.
- Prefer the simplest thing that works; cut what isn't needed.
