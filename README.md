# Shortlisted

**The job application copilot that never lies on your CV.**

Applying to jobs is a part-time job nobody pays you for: the same form, the same
questions, fifteen minutes at a time, dozens of times a week. Shortlisted turns
that into about two minutes per application — and every application you send
makes the next one faster.

🧩 Chrome Web Store (coming soon) · ⚖️ AGPL-3.0 · 🔌 Bring your own AI key

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

- **Runs entirely on your machine.** There is no Shortlisted account, no
  Shortlisted server, and no Shortlisted subscription. Your profile, CVs,
  applications and answers live in your browser's storage and go nowhere else.
  For the AI features you plug in your own key — any OpenAI-compatible endpoint,
  including a model running locally — and you pay that provider directly, at
  their prices. Filling forms and the answer bank need no AI at all.

## Why it works when auto-apply tools don't

- **Every application is genuinely yours — so it gets read.** Shortlisted preps
  the form; you review and send. Mass-apply bots are why recruiters auto-reject
  waves of identical applications (and why those tools' users get accounts
  flagged). A reviewed application from a real person doesn't land in that
  pile. Quality at volume beats volume alone.

- **You can defend every line of your CV in the interview.** Tailoring picks
  which true things to lead with and says them in the job's vocabulary — it
  can't add skills, employers, or numbers, by construction. So when the
  interviewer digs into a bullet point, you have a story, because it's yours.
  Candidates of CV-fabricating tools find out the hard way, in round one.

- **Recruiters meet a real person from the very first click.** Nothing the
  extension does is something you couldn't do yourself — it's just 10× faster.
  That's also why it sails past the bot-detection that breaks auto-appliers:
  there's no bot to detect. A human is right there, clicking submit.

- **Nothing to trust us about.** The one hard question with a tool that reads
  your CV and your job history is where that data goes. Here it doesn't go
  anywhere: the only host the extension ever contacts is the AI endpoint you
  typed in yourself. That's not a promise in a privacy policy — it's the whole
  architecture, and it's in this repo.

All of this is open source, so you don't have to take our word for any of it —
read the code, build it yourself.

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

1. **Connect your AI** — paste an API address and a model. Anything
   OpenAI-compatible works; the wizard tests it before moving on.
2. **Upload your CV** (PDF) — it's turned into a structured profile you can
   edit any time.
3. **Answer the three questions every job asks** — salary, notice period,
   work authorization. Once, forever.
4. **Open any job posting** and hit **Fill this application** in the panel
   that appears. Review, answer anything new, submit.

Filling forms and the answer bank work with **no AI at all**, so you can skip
step 1 and come back to it. AI powers CV import, tailoring, and fit scores.

### Which AI to use

Any endpoint that speaks OpenAI's `/chat/completions`:

| | |
|---|---|
| **Hosted** | OpenAI, OpenRouter, Groq, Together, Google Gemini (compat endpoint) |
| **On your own machine** | LM Studio, Ollama, llama.cpp, vLLM — no key needed, nothing leaves your computer |

Set a cheaper second model for the bulk work (reading CVs, scoring jobs) and
keep the good one for writing — that's most of the cost, and it's one field.

Nothing here needs tool calling or function calling: structured output is a
JSON schema in the prompt plus a forgiving parser, which is why modest local
models work. Reading **scanned** PDFs is the one thing that needs a
vision-capable model; the setup screen tells you whether yours has it.

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
`src/sidepanel/` (React UI) · `src/ai/` (`run.ts` entry point, `client.ts`
transport, `capabilities/` prompt + schema + validation per task,
`workflows/` multi-step jobs) · `src/workflow/` (the step engine) ·
`src/pdf/` (CV rendering) · `src/background/` (service worker).

## License

[AGPL-3.0](LICENSE). Read it, verify it, fork it — if you offer a modified
version as a service, your changes must be open too.

This is the whole product. There is no paid tier, no hosted service, and no
part of it held back.
