import type { tLocale } from '../en'

export const onboarding: tLocale['onboarding'] = {
  back: '← Zurück',
  welcomeLoginLink: 'Schon ein Konto? Anmelden',
  loginTitle: 'Willkommen zurück.',
  loginLead: 'Gib deine E-Mail ein — wir schicken dir einen 6-stelligen Code.',

  welcomeTitle: 'Bringen wir dich auf die Shortlist.',
  welcomeLead:
    'Erzähl einmal von dir. Danach füllt sich jede Bewerbung von selbst — du prüfst nur noch und klickst auf Absenden.',
  importCvTitle: 'Ich habe einen Lebenslauf',
  importCvSub: 'Lade deinen Lebenslauf hoch oder füge ihn ein — die KI macht daraus dein Profil. ~1 Minute.',
  startBlankTitle: 'Ich habe keinen Lebenslauf',
  startBlankSub: 'Kein Problem — drinnen helfen wir dir, dein Profil und einen sauberen Lebenslauf aufzubauen.',

  pasteTitle: 'Dein Lebenslauf, bitte.',
  pasteLead: 'Lade das PDF hoch oder füge den Text ein.',
  uploadPdf: 'PDF hochladen',
  uploadSubIdle: 'Die KI liest es und erstellt dein Profil.',
  readingCv: 'Lese deinen Lebenslauf…',
  readingCloudSub: 'Extrahiere dein Profil — dauert einen Moment.',
  pastePlaceholder: '…oder füge hier deinen Lebenslauf-Text ein.',
  buildProfile: 'Profil erstellen',
  reviewTitle: 'Stimmt das so?',
  reviewLead: (roles: number, skills: number) =>
    `${roles} ${roles === 1 ? 'Stelle' : 'Stellen'} und ${skills} Skills gefunden. Korrigiere, was nicht stimmt — alles lässt sich später noch ändern.`,
  looksRight: 'Passt so',

  answersTitle: 'Drei Fragen, die jeder Job stellt.',
  answersLead: 'Einmal hier beantworten, nie wieder in einer Bewerbung.',
  salaryLabel: 'Gehaltsvorstellung',
  salaryPlaceholder: '"4.000 €/Monat" oder "Verhandelbar"',
  noticeLabel: 'Wann kannst du anfangen?',
  noticePlaceholder: '"Sofort" oder "2 Wochen Kündigungsfrist"',
  sponsorshipLabel: 'Brauchst du Visa-Sponsoring?',
  sponsorshipPlaceholder: '"Nein — Remote-Freelancer"',
  continue: 'Weiter',

  verifyTitle: 'Letzter Schritt — E-Mail bestätigen.',
  verifyLead:
    'Ein Code und du bist drin: dein Profil gesichert, deine kostenlosen KI-Credits freigeschaltet, und deine kostenlose Shortlisted-Profilseite, wenn du sie willst.',
  emailPlaceholder: 'du@beispiel.de',
  sendCode: 'Code senden',
  sending: 'Wird gesendet…',
  inboxTitle: 'Schau in dein Postfach.',
  inboxLead: (email: string) =>
    `Wir haben einen 6-stelligen Code an ${email} geschickt. Gib ihn hier ein und du bist fertig — dann öffne eine Stellenanzeige und klick auf "Diese Bewerbung ausfüllen".`,
  codeLabel: 'Code',
  codePlaceholder: '123456',
  verifyStart: 'Bestätigen & loslegen',
  checking: 'Wird geprüft…',
  resendCode: 'Code erneut senden',
  changeEmail: 'E-Mail ändern',
}
