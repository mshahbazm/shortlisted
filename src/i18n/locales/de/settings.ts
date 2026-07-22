import type { tLocale } from '../en'

export const settings: tLocale['settings'] = {
  title: 'Einstellungen',
  hint: 'Ausfüllen funktioniert ohne Einrichtung. Dein Konto schaltet KI frei — Lebenslauf-Import, Anpassung, Fit-Scores.',

  languageTitle: 'Sprache',
  languageAuto: 'Automatisch (Browsersprache)',

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
  checkCredits: 'Credits prüfen',
  planFree: 'Free',
  planPro: 'Pro',
  signOutDevice: 'Auf diesem Gerät abmelden',

  backupTitle: 'Backup',
  backupSummary: 'alles exportieren / importieren',
  exportJson: 'JSON exportieren',
  importJson: 'JSON importieren',
  imported: 'Importiert.',
  importFailed: (msg: string) => `Import fehlgeschlagen: ${msg}`,

  detectOn: 'an — alle Websites',
  detectOff: 'aus — nur bekannte Jobbörsen',
  detectHint:
    'Shortlisted achtet auf allen Websites auf Bewerbungsformulare und erscheint, sobald es eines erkennt. Die Prüfung läuft auf Ihrem Rechner, nichts davon wird gesendet. Schalten Sie es aus, um es auf die direkt unterstützten Jobbörsen zu begrenzen.',
  detectToggle: 'Bewerbungsformulare auf jeder Website erkennen',

  creditsLeft: 'Credits übrig',
  creditsOf: 'von',
  goPro: 'Pro holen — 100 Credits im Monat',
  proMonthly: 'Pro monatlich — 15 $/Monat',
  proAnnual: 'Pro jährlich — 150 $/Jahr',
  proFoot: '1 $ für die ersten 7 Tage, dann 15 $/Monat. 100 Credits im Monat; Formulare ausfüllen ist immer kostenlos.',
  manageSub: 'Abo verwalten',
  historyTitle: 'Credit-Verlauf',
  historySummary: 'Gutschriften, Verbrauch, monatliche Resets',
  historyHint: 'Jeder gutgeschriebene, verbrauchte und zurückgesetzte Credit — dein vollständiger Verlauf.',
  historyEmpty: 'Noch keine Credit-Aktivität.',
  whereILook: 'Wo ich nach Formularen suche',
}
