// Home: the context slot, the two paid actions, the job list, applied, and
// the "something new" composer. Replaces the old Apply tab.
//
// Tone: plain spoken English for someone who may be applying for their first
// job. No jargon, no hedging, and never a claim we can't back — we know an
// application was filled, we do NOT know whether anyone replied.

export const home = {
  // --- context slot: four states, one at a time ---
  onThisPage: 'On this page',
  formOnThisTab: 'Application form on this tab',
  jobOnThisPage: 'Job on this page',
  fieldCount: (n: number) => `${n} field${n === 1 ? '' : 's'}`,
  bubbleOpenNote: 'The Shortlisted panel is open on the page — fill from there, or',
  bringItHere: 'fill it from here',
  fillThisApplication: 'Fill this application',
  fillFoot: 'Free · your default CV attaches · you review and submit',
  noFormHere: 'No form here — the apply button leads somewhere else.',
  saveToList: 'Save to list',

  // --- the two paid actions ---
  checkMyFit: 'Check my fit',
  checkMyFitSub: 'An honest score before you spend an hour',
  checkMyFitSubGeneric: 'Paste a job, get an honest score',
  tailorACv: 'Tailor a CV',
  tailorACvSub: 'Re-angled for this job, nothing invented',
  tailorACvSubGeneric: 'Re-angled for one job, nothing invented',
  oneCredit: '1 credit',
  noCreditsLeft: 'No credits left',

  // --- pending questions ---
  questionsWaiting: (n: number) => `${n} question${n === 1 ? '' : 's'} waiting on you`,
  questionsTitle: 'Questions waiting',
  questionsLede:
    'Answer once. I’ll reuse it on any form that asks the same thing, however it’s worded — and I’ll tidy the wording without changing your facts.',
  answeredCount: (n: number) => `Already answered · ${n}`,
  inYourProfile: 'In your profile',
  yourAnswer: 'In your own words',

  // --- job list ---
  jobListTitle: 'Job list',
  savedCount: (n: number) => `${n} saved`,
  startApplying: 'Start applying',
  emptyJobList: 'No jobs saved yet. Paste a few links and I’ll work through them with you.',
  addJobsLabel: 'Add jobs',
  addJobsPlaceholder: 'Paste job links, one per line',
  addToList: 'Add to list',
  addedJobs: (n: number) => `Added ${n} job${n === 1 ? '' : 's'}.`,
  notScoredYet: 'not scored yet',

  // --- applied ---
  recentlyApplied: 'Recently applied',
  seeAllApplied: (n: number) => `See all ${n}`,
  appliedTitle: (n: number) => `Applied · ${n}`,
  appliedEmpty: 'Nothing yet. Applications you send get logged here on their own.',
  // The honesty line. We fill forms; we cannot read anyone's email.
  noInbox: 'I can’t see your inbox.',
  noInboxBody: 'Shortlisted knows you applied because it filled the form — anything after that is yours to mark.',
  cvSent: 'CV sent',
  statusApplied: 'Applied',
  statusHeardBack: 'Heard back',
  statusInterviewing: 'Interviewing',
  statusOffer: 'Offer',
  statusRejected: 'No',

  // --- composer ---
  composerLabel: 'Something new to add?',
  composerPlaceholder: 'A course, a project, a skill you forgot…',
  composerHint: 'I’ll file it in the right part of your profile. Free.',
  composerSubmit: 'Add to profile',
  composerSaved: (n: number) => `Filed into your profile ✓ (${n} new)`,
  composerNothingNew: 'Nothing new in there — it’s already on your profile.',
  composerNoJob: 'I couldn’t attach that to a job. Try naming where you did it.',

  // --- apply run ---
  applyingTitle: 'Applying',
  runProgress: (i: number, n: number) => `${i} of ${n}`,
  openAndFill: 'Open & fill',
  skipThisOne: 'Skip this one',
  seeFullScore: 'See the full score',
  runDoneTitle: 'That’s the list',
  runDoneBody: (n: number) =>
    `You worked through ${n} job${n === 1 ? '' : 's'}. Add more whenever you’re ready.`,
  backToHome: 'Back to home',

  // --- fit ---
  yourFit: 'Your fit',
  leadWith: 'Lead with:',
  howYouMatchUp: 'How you match up',
  beReadyFor: 'Be ready for these questions',
  gapsAddPrompt: 'Have any of these? Add them',
  relDirect: 'direct',
  relTransferable: 'transferable',
  relGap: 'gap',
  notShown: 'not shown',
  scoreMyFit: 'Score my fit',
  scoring: 'Scoring…',
  updateProfile: 'Update profile',
  saveTheJob: 'Save the job',

  // --- fill result ---
  filledTitle: (filled: number, total: number) => `${filled} of ${total} fields filled`,
  filledWithCv: (cv: string) => `Your CV ${cv} is attached. Look it over, then submit the form yourself.`,
  filledNoCv: 'Look it over, then submit the form yourself.',
  couldntAnswer: (n: number) => `${n} I couldn’t answer`,
  saveAndFill: 'Save & fill',
  reusedEverywhere: 'Saved to your standard answers — asked on nearly every form.',

  // --- fill errors: codes come from the background, wording lives here ---
  lookForPanel: 'Look for the Shortlisted panel on the page.',
  fillNoTab: 'No active tab.',
  fillCannotFill: 'This page can’t be filled.',
  fillNoForm: 'No application form found on this page.',

  credits: (n: number) => `${n} credits`,
  settingsLabel: 'Settings',
  back: 'Back',
}
