// The Settings tab: language, account (email OTP + credits), backup, server.

export const settings = {
  title: 'Settings',
  hint: 'Filling works with no setup. Your account unlocks AI — CV import, tailoring, fit scores.',

  languageTitle: 'Language',
  languageAuto: 'Auto (browser language)',

  accountIntro:
    'Sign in with your email to unlock AI and keep your data in your account. Free: 10 credits. Pro ($9/mo): 100 credits/month. One tailored CV ≈ 1 credit.',
  emailPlaceholder: 'you@example.com',
  sendCode: 'Send me a code',
  sending: 'Sending…',
  codeSent: 'Code sent — check your email.',
  codeLabel: 'The 6-digit code from your email',
  codePlaceholder: '123456',
  signIn: 'Sign in',
  checking: 'Checking…',
  resendCode: 'Resend code',
  signedIn: 'Signed in.',
  checkCredits: 'Check my credits',
  planFree: 'Free',
  planPro: 'Pro',
  signOutDevice: 'Sign out on this device',

  backupTitle: 'Backup',
  backupSummary: 'export / import everything',
  exportJson: 'Export JSON',
  importJson: 'Import JSON',
  imported: 'Imported.',
  importFailed: (msg: string) => `Import failed: ${msg}`,

  detectOn: 'on — every site',
  detectOff: 'off — known job boards only',
  detectHint:
    'Shortlisted watches for job application forms on every site and appears when it recognises one. Pages are checked on your computer and nothing about them is sent anywhere. Turn this off to limit it to the job boards we support directly.',
  detectToggle: 'Recognise application forms on any site',

  creditsLeft: 'Credits left',
  creditsOf: 'of',
  goPro: 'Go Pro — 100 credits a month',
  proFoot: '$9 a month. One tailored CV or fit score uses 1 credit. Filling forms is always free.',
  whereILook: 'Where I look for forms',
}
