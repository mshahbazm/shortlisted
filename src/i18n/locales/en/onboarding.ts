// The first-run wizard (sidepanel/Onboarding.tsx).

export const onboarding = {
  back: 'Back',
  skip: 'Skip',

  // No-CV guided builder
  buildTitle: "Let's build your profile together.",
  buildLead: "Tell me where you're at — I'll ask the right questions.",
  buildStartingTitle: "I'm just starting out",
  buildStartingSub: 'Studying, or after my first job.',
  buildWorkingTitle: "I've been working",
  buildWorkingSub: 'I just never needed a CV before.',
  buildCv: 'Build my CV',
  probeNext: 'Next',
  probeTitle: 'A few quick questions.',
  probeLead: "Answer what you can — these help me build a stronger CV. Skip any that don't fit.",
  talkStartingTitle: "Tell me what you've done.",
  talkStartingLead:
    "A project, volunteering, a club, part-time work — anything counts. Dump it all here and I'll format it.",
  talkStartingPlaceholder:
    'e.g. Final-year project — I built an app to find free study rooms on campus. I wrote the backend and ran our weekly standups.',
  talkWorkingTitle: 'Your most recent job.',
  talkWorkingLead:
    "Where you worked, what you did, anything you're proud of — just talk, and I'll shape it into your CV.",
  talkWorkingPlaceholder:
    'e.g. I led a team of 6 at Kordo Logistics for 3 years. I fixed the weekend shift rota so we stopped running short, and trained new starters.',

  welcomeTitle: "Let's get you shortlisted.",
  welcomeLead:
    'Create your career profile once. Shortlisted reuses your details and answers across job applications. You review everything before you submit.',
  importCvTitle: 'I have a CV',
  importCvSub: 'Upload or paste your resume — AI turns it into your profile. ~1 minute.',
  startBlankTitle: "I don't have a CV",
  startBlankSub: "No problem — we'll help you build your profile and a polished CV inside.",
  welcomeLoginLink: 'Already have an account? Log in',
  loginTitle: 'Welcome back.',
  loginLead: "Enter your email — we'll send you a 6-digit code.",

  pasteTitle: 'Your CV, please.',
  pasteLead: 'Upload the PDF, or paste the text.',
  uploadPdf: 'Upload PDF',
  uploadSubIdle: 'AI reads it and builds your profile.',
  readingCv: 'Reading your CV…',
  readingCloudSub: 'Extracting your profile — takes a moment.',
  buildingTitle: 'Setting up your profile…',
  buildingLead: 'Almost there — just a few seconds.',
  pastePlaceholder: '…or paste your resume text here.',
  buildProfile: 'Build my profile',

  reviewTitle: 'Did I get this right?',
  reviewLead: (roles: number, skills: number) =>
    `Found ${roles} role${roles === 1 ? '' : 's'} and ${skills} skills. Fix anything that's off — the rest is editable later.`,
  looksRight: 'Looks right',

  answersTitle: 'A few quick basics.',
  jobTypeLabel: 'What are you looking for?',
  jobTypePlaceholder: 'Full-time, internship, contract…',
  answersLead: 'Answer once here, never again on an application.',
  salaryLabel: 'Salary expectation',
  salaryPlaceholder: '"$4,000/month" or "Open to discussion"',
  noticeLabel: 'When can you start?',
  noticePlaceholder: '"Immediately" or "2 weeks notice"',
  sponsorshipLabel: 'Do you need visa sponsorship?',
  sponsorshipPlaceholder: '"No — remote contractor"',
  continue: 'Continue',

  verifyTitle: 'Create your account.',
  verifyLead:
    "One code and you're in — your data saved to your account and your free AI credits unlocked.",
  emailPlaceholder: 'you@example.com',
  sendCode: 'Send code',
  sending: 'Sending…',
  inboxTitle: 'Check your inbox.',
  inboxLead: (email: string) =>
    `We sent a 6-digit code to ${email}. Enter it below to finish.`,
  codeLabel: 'Code',
  codePlaceholder: '123456',
  verifyStart: 'Verify & start',
  checking: 'Checking…',
  resendCode: 'Resend code',
  changeEmail: 'Change email',
}
