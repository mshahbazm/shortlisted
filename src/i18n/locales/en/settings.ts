// The Settings tab: language, account (email OTP + credits), backup, server.

export const settings = {
  title: 'Settings',
  hint: 'Filling works with no setup. Your account unlocks AI — CV import, tailoring, fit scores.',

  languageTitle: 'Language',
  languageAuto: 'Auto (browser language)',

  accountTitle: 'Account',
  notSignedIn: 'not signed in',
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
  signedInAs: (email: string) => `Signed in as ${email}`,
  checkCredits: 'Check my credits',
  usageLine: (plan: string, used: number, limit: number, monthly: boolean) =>
    `${plan} · ${used} of ${limit} credits used${monthly ? ' this month' : ' (lifetime)'}`,
  planFree: 'Free',
  planPro: 'Pro',
  signOutDevice: 'Sign out on this device',

  backupTitle: 'Backup',
  backupSummary: 'export / import everything',
  exportJson: 'Export JSON',
  importJson: 'Import JSON',
  imported: 'Imported.',
  importFailed: (msg: string) => `Import failed: ${msg}`,
}
