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

  detectTitle: 'Job detection',
  detectOn: 'on — every site',
  detectOff: 'off — known job boards only',
  detectHint:
    'Shortlisted watches for job application forms on every site and appears when it recognises one. Pages are checked on your computer and nothing about them is sent anywhere. Turn this off to limit it to the job boards we support directly.',
  detectToggle: 'Recognise application forms on any site',

  serverTitle: 'Cloud server',
  serverDevHint:
    'This is an unpacked development build, so it talks to your local server. Change it only if your server runs elsewhere.',
  serverProdHint:
    'Connected to Shortlisted Cloud. Leave this empty unless you have been asked to point it somewhere else.',
  serverUrlLabel: 'Server URL',
  serverReset: 'Use the default',
}
