// Free-form profile extraction (cloud). The no-CV builder's input is casual,
// conversational and often sparse — someone describing themselves in plain words,
// not a formatted résumé — so it gets its own prompt, tuned to INTERPRET prose
// into structured entries. It reuses the résumé parser's schema, validation and
// ExtractedProfile -> Profile mapping (only the instructions differ), so the
// output shape is identical to every other extraction path.

import { extractProfile } from '../../capabilities/extract-profile'
import type { LlmClient } from '../../systemAgent'
import type { Profile, ProfileIntent } from '../../../lib/types'

const FREEFORM_SYSTEM_PROMPT =
  `You turn someone's casual, plain-words description of themselves into strictly structured JSON. The input is a ` +
  `guided Q&A transcript: someone who has never written a résumé talked about themselves and answered a few ` +
  `follow-up questions. It is conversational and often sparse — your job is to INTERPRET what they say into a ` +
  `complete, well-written profile, without ever adding anything they didn't say.\n` +
  `Set isResume=true for any real self-description (a job, studies, a project, volunteering, a skill). Set it ` +
  `false only for gibberish or text that is not about this person at all.\n` +
  `Rules:\n` +
  `- TRUTH ONLY: use only what they actually said (across the intro AND the answers). Never invent employers, ` +
  `titles, dates, numbers, metrics or skills, and never inflate a plain statement into an achievement. If it ` +
  `isn't stated, leave it out. Absolute.\n` +
  `- WRITE the profile, don't just file it: from their own words, compose a real headline (who they are / what ` +
  `they're aimed at), a short summary, and up to 3 scannable highlights — plus the structured entries. This is ` +
  `honest phrasing of THEIR material, never new facts.\n` +
  `- Map plain language to structure: a job, internship, volunteering, club role, course or project each ` +
  `becomes the right entry (experience / education / certification / skill), with per-role skills where stated. ` +
  `A one-line mention still becomes a proper entry. Use a sensible companyName (employer, organisation, school, ` +
  `or "Personal project") and title (their role, or the project's name). Omit dates and metrics that weren't given.\n` +
  `- Consolidate: if their work is freelance or many short gigs, prefer ONE coherent entry over one per client.\n` +
  `- Capture EVERYTHING real they mention — nothing dropped for being brief or informal.\n` +
  `- Identity: firstName, lastName, email, phone, location default to "" when not stated (they'll fill these in ` +
  `next) — do NOT write "Unknown".\n` +
  `- Enums exactly as listed ("full_time", not "Full-Time"). highlights: UP TO 3, drawn ONLY from what they ` +
  `said; fewer is fine, never invent one, never add a metric that wasn't stated.\n` +
  `- Write output values in the SAME language they used.`

// The same job for someone who is not job hunting. Two rules invert outright:
//
//  - Consolidation. The CV prompt folds many short gigs into one entry, because
//    a recruiter reading a résumé wants a clean history. For a professional's
//    page those individual engagements ARE the portfolio — collapsing a
//    designer's twelve clients into "Freelance Designer" deletes the section
//    that does the selling.
//  - Identity. The CV prompt leaves contact details blank because "they'll fill
//    these in next". A page exists to be contacted through, so anything they
//    said about reaching them is load-bearing.
const FOUND_SYSTEM_PROMPT =
  `You turn a professional's plain-words description of their work into strictly structured JSON. The input is a ` +
  `guided Q&A transcript: a working professional — a doctor, lawyer, consultant, coach, designer or similar — ` +
  `describing what they do, for a page that shows their work and takes enquiries. They are NOT writing a résumé ` +
  `and NOT applying for a job. Your job is to INTERPRET what they say into a complete, well-written profile, ` +
  `without ever adding anything they didn't say.\n` +
  `Set isResume=true for any real self-description of their work or practice. Set it false only for gibberish or ` +
  `text that is not about this person at all.\n` +
  `Rules:\n` +
  `- TRUTH ONLY: use only what they actually said. Never invent clients, credentials, registrations, dates, ` +
  `numbers, prices or outcomes, and never inflate a plain statement into an achievement. Absolute.\n` +
  `- WRITE the profile, don't just file it: compose a headline naming what they do and who for, a short summary in ` +
  `their voice, and up to 3 highlights. Honest phrasing of THEIR material, never new facts.\n` +
  `- Keep engagements SEPARATE: distinct clients, practices, firms or projects each become their own entry. Do NOT ` +
  `consolidate them — for this page each one is a piece of the portfolio. Only merge when they clearly describe a ` +
  `single continuous engagement.\n` +
  `- Their own practice, clinic or firm is an entry in its own right, with them as principal — not a job they hold.\n` +
  `- Credentials matter: degrees, licences, registrations, board certifications, memberships and insurers become ` +
  `certification or education entries. These carry the credibility a résumé would get from employers.\n` +
  `- Services they offer become per-role skills where stated; keep their own words for them ("root canal", ` +
  `"immigration appeals"), never translate them into generic job skills.\n` +
  `- Identity: capture whatever they gave — location, email, phone, the area they serve. A page exists to be ` +
  `contacted through. Default to "" when not stated; do NOT write "Unknown".\n` +
  `- Capture EVERYTHING real they mention — nothing dropped for being brief or informal.\n` +
  `- Enums exactly as listed ("full_time", not "Full-Time"). highlights: UP TO 3, drawn ONLY from what they said.\n` +
  `- Write output values in the SAME language they used.`

export function extractFreeform(client: LlmClient, text: string, intent: ProfileIntent = 'hired'): Promise<Profile> {
  return extractProfile(client, text, intent === 'found' ? FOUND_SYSTEM_PROMPT : FREEFORM_SYSTEM_PROMPT)
}
