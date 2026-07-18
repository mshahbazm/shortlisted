# Shortlisted

**The job application copilot that never lies on your CV.**

Applying to jobs is a part-time job nobody pays you for: the same form, the same
questions, fifteen minutes at a time, dozens of times a week. Shortlisted turns
that into about two minutes per application — and every application you send
makes the next one faster.

🌐 [shortlist.id](https://shortlist.id) · 🧩 Chrome Web Store (coming soon) · ⚖️ AGPL-3.0

---

## What it does

- **Fills applications for you.** Works on Greenhouse, Lever, Ashby, Workable,
  BambooHR, Breezy, Recruitee, and SmartRecruiters — plus a one-click mode for
  any other career site. Your profile fills the form; you review and click
  submit. It never touches a field you've already filled.

- **Learns every question, once.** The first time an application asks something
  it can't answer ("Why do you want to work here?", "Describe your LLM
  experience"), it asks *you* — right on the page. Your answer is saved and
  reused on every future application that asks the same thing, in any phrasing.
  After ~50 applications, the bank covers almost everything an ATS can ask.

- **Tailors your CV without inventing a word.** Paste a job posting and get a
  CV variant angled for that role — same true facts, reordered and rephrased in
  the job's vocabulary. Lying is structurally impossible: every work entry is
  rebuilt from your real profile, and skills must be a subset of what you
  actually have. What the job wants that you *don't* have is shown to you,
  never written onto the CV.

- **Tells you your odds, honestly.** One click on any job page: an evidence-based
  fit score out of 10, what to lead with, and which gaps to expect questions
  about. Built to be honest, not encouraging — unrelated experience is capped,
  and generic claims count for nothing.

- **Keeps your data on your machine.** Your profile, answers, and CVs live in
  local browser storage. No account required. AI features run on
  [Shortlisted Cloud](https://shortlist.id) (opt-in), your own API key, or a
  local model via Ollama / LM Studio — your choice, switchable any time.

## The rules this project lives by

1. **You click submit. Always.** No auto-apply, no mass-apply, no bots.
2. **No CAPTCHAs touched, ever.**
3. **Nothing invented on your CV.** Tailoring rearranges the truth; it cannot
   add to it.
4. **Local by default.** If you turn on an AI provider, the text needed for that
   task is sent, used for the task, and that's it — Shortlisted Cloud stores
   nothing, sells nothing, trains on nothing.

This code is open source so you don't have to take our word for any of that —
read it, build it yourself, watch the network tab.

<!-- TODO before launch: screenshots — wizard, on-page fill panel, fit score -->

## Install

**Chrome Web Store:** coming soon.

**From source:**

```bash
git clone https://github.com/mshahbazm/shortlisted.git
cd shortlisted
bun install && bun run build
```

Then open `chrome://extensions`, enable **Developer mode**, click
**Load unpacked**, and pick the `dist/` folder.

## Getting started

Click the Shortlisted icon and the setup wizard walks you through it:

1. **Upload your CV** (PDF, read locally) — AI turns it into a structured
   profile you can edit any time.
2. **Answer the three questions every job asks** — salary, notice period,
   work authorization. Once, forever.
3. **Open any job posting** and hit **Fill this application** in the panel
   that appears. Review, answer anything new, submit.

AI options (Settings → AI):

| Option | Needs | Cost |
|---|---|---|
| Shortlisted Cloud | nothing — just works | 10 free credits, then Pro |
| Anthropic / OpenAI | your API key | your usage |
| Ollama / LM Studio | a local model | free |

Filling and the answer bank work with **no AI at all** — AI powers CV import,
tailoring, and fit scores.

## Contributing

The most valuable contribution is an **ATS adapter fix**: found a form that
fills wrong? Open an issue with the site + field, or send a PR —
adapters are small configs in [`src/content/adapters.ts`](src/content/adapters.ts)
over a shared fill engine.

Dev loop:

```bash
bun run dev    # CRXJS hot reload — load dist/ once, edits apply live
bun run build  # type-check + production build
```

Rough map: `src/content/` (ATS detection, fill engine, on-page panel) ·
`src/sidepanel/` (React UI) · `src/ai/` (capabilities: prompt + schema +
validation per task) · `src/pdf/` (CV rendering) · `src/background/`
(service worker).

## License

[AGPL-3.0](LICENSE). Read it, verify it, fork it — if you offer a modified
version as a service, your changes must be open too.

The optional hosted tier (Shortlisted Cloud) is a separate closed-source
service that funds this project. The extension is fully functional without it,
forever.
