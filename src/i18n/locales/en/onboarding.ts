// The first-run wizard (sidepanel/Onboarding.tsx).

export const onboarding = {
  back: '← Back',

  welcomeTitle: "Let's get you shortlisted.",
  welcomeLead:
    'Tell me about yourself once. Then every job application fills itself — you just review and hit submit.',
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

  answersTitle: 'Three questions every job asks.',
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
    `We sent a 6-digit code to ${email}. Type it here and you're done — then open any job posting and hit "Fill this application".`,
  codeLabel: 'Code',
  codePlaceholder: '123456',
  verifyStart: 'Verify & start',
  checking: 'Checking…',
  resendCode: 'Resend code',
  changeEmail: 'Change email',
}
