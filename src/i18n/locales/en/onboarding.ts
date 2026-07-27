// The first-run wizard (sidepanel/Onboarding.tsx).

export const onboarding = {
  back: 'Back',
  skip: 'Skip',

  // No-CV guided builder
  buildTitle: "Let's build your profile together.",
  buildLead: "Pick where you're at — the questions adapt to fit.",
  buildStartingTitle: "I'm just starting out",
  buildStartingSub: 'Studying, or after my first job.',
  buildWorkingTitle: "I've been working",
  buildWorkingSub: 'I just never needed a CV before.',
  buildHaveResumeTitle: 'I already have a resume',
  buildHaveResumeSub: "Upload it — we'll turn it into your profile.",
  buildCv: 'Build my CV',
  probeNext: 'Next',
  probeTitle: 'A few quick questions.',
  probeLead: "Answer what you can — they make for a stronger CV. Skip any that don't fit.",
  talkStartingTitle: "What have you done?",
  talkStartingLead:
    'A project, volunteering, a club, part-time work — anything counts. Dump it all in and it gets shaped into your CV.',
  talkStartingPlaceholder:
    'e.g. Final-year project — I built an app to find free study rooms on campus. I wrote the backend and ran our weekly standups.',
  talkWorkingTitle: 'Your most recent job.',
  talkWorkingLead:
    "Where you worked, what you did, anything you're proud of — write freely and it gets shaped into your CV.",
  talkWorkingPlaceholder:
    'e.g. I led a team of 6 at Kordo Logistics for 3 years. I fixed the weekend shift rota so we stopped running short, and trained new starters.',
  talkCountNeed: (n: number, min: number) => `${n} / ${min} characters — a little more`,
  talkCountReady: 'The more you share, the better your CV — projects, wins, anything.',

  welcomeTitle: "Let's get you shortlisted.",
  welcomeLead:
    'Create your career profile once. Shortlisted reuses your details and answers across job applications. You review everything before you submit.',
  importCvTitle: 'I have a CV',
  importCvSub: 'Upload or paste your resume — AI turns it into your profile. ~1 minute.',
  startBlankTitle: "I don't have a CV",
  startBlankSub: "No problem — we'll help you build your profile and a polished CV inside.",
  nameTitle: 'What should we call you?',
  nameLead: 'It goes on your CV, so use the name you apply under.',

  pasteTitle: 'Your CV, please.',
  pasteLead: 'Upload the PDF, or paste the text.',
  uploadPdf: 'Upload PDF',
  uploadSubIdle: 'AI reads it and builds your profile.',
  readingCv: 'Reading your CV…',
  readingCloudSub: 'Pulling the text out — takes a moment.',
  buildingTitle: 'Setting up your profile…',
  buildingLead: 'Almost there — just a few seconds.',
  pastePlaceholder: '…or paste your resume text here.',
  buildProfile: 'Build my profile',

  reviewTitle: 'Does this look right?',
  reviewLead: (roles: number, skills: number) =>
    `Found ${roles} role${roles === 1 ? '' : 's'} and ${skills} skills. Fix anything that's off — the rest is editable later.`,
  looksRight: 'Looks right',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  portfolio: 'Portfolio',
  linkedinPlaceholder: 'linkedin.com/in/you',
  githubPlaceholder: 'github.com/you',
  portfolioPlaceholder: 'yoursite.com',

  answersTitle: 'A few quick basics.',
  jobTypeLabel: 'What are you looking for?',
  jobTypeFullTime: 'Full-time',
  jobTypePartTime: 'Part-time',
  jobTypeContract: 'Contract',
  jobTypeInternship: 'Internship',
  jobTypeFreelance: 'Freelance',
  jobTypeOpenToAny: 'Open to any',
  answersLead: 'Answer once here, never again on an application.',
  salaryHourlyLabel: 'Hourly rate',
  salaryHourlyPlaceholder: 'e.g. 25',
  salaryMonthlyLabel: 'Monthly rate',
  salaryMonthlyPlaceholder: 'e.g. 4000',
  noticeDaysLabel: 'When can you start? (days)',
  noticeDaysHint: '0 = right away',
  continue: 'Continue',

  checking: 'One moment…',
}
