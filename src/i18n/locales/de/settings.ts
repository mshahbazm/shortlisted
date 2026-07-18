import type { tLocale } from '../en'

export const settings: tLocale['settings'] = {
  title: 'Einstellungen',
  hint: 'Ausfüllen funktioniert ohne Einrichtung. Dein Konto schaltet KI frei — Lebenslauf-Import, Anpassung, Fit-Scores.',

  languageTitle: 'Sprache',
  languageAuto: 'Automatisch (Browsersprache)',

  accountTitle: 'Konto',
  notSignedIn: 'nicht angemeldet',
  accountIntro:
    'Melde dich mit deiner E-Mail an, um KI freizuschalten und deine Daten in deinem Konto zu speichern. Free: 10 Credits. Pro (9 $/Monat): 100 Credits pro Monat. Ein angepasster Lebenslauf ≈ 1 Credit.',
  emailPlaceholder: 'du@beispiel.de',
  sendCode: 'Schick mir einen Code',
  sending: 'Wird gesendet…',
  codeSent: 'Code gesendet — sieh in deinem Postfach nach.',
  codeLabel: 'Der 6-stellige Code aus deiner E-Mail',
  codePlaceholder: '123456',
  signIn: 'Anmelden',
  checking: 'Wird geprüft…',
  resendCode: 'Code erneut senden',
  signedIn: 'Angemeldet.',
  signedInAs: (email: string) => `Angemeldet als ${email}`,
  checkCredits: 'Credits prüfen',
  usageLine: (plan: string, used: number, limit: number, monthly: boolean) =>
    `${plan} · ${used} von ${limit} Credits genutzt${monthly ? ' diesen Monat' : ' (insgesamt)'}`,
  planFree: 'Free',
  planPro: 'Pro',
  signOutDevice: 'Auf diesem Gerät abmelden',

  backupTitle: 'Backup',
  backupSummary: 'alles exportieren / importieren',
  exportJson: 'JSON exportieren',
  importJson: 'JSON importieren',
  imported: 'Importiert.',
  importFailed: (msg: string) => `Import fehlgeschlagen: ${msg}`,

  cloudServerTitle: 'Cloud-Server',
  cloudServerDefault: (url: string) => `${url} (Standard)`,
  cloudServerLabel: (url: string) => `Eigene URL — leer lassen für den Standard (${url})`,

  rulesTitle: 'Die Regeln',
  rulesSummary: 'kein Auto-Absenden, keine Lügen',
  rulesBody:
    'Du klickst auf Absenden — immer. CAPTCHAs gehören dir. Die Lebenslauf-Anpassung ordnet nur um, was wahr ist — sie kann keine Fähigkeiten oder Erfahrung erfinden.',
}
