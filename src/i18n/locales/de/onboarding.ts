import type { tLocale } from '../en'

export const onboarding: tLocale['onboarding'] = {
  // No-CV guided builder
  buildTitle: 'Erstellen wir dein Profil zusammen.',
  buildLead: 'Sag mir, wo du stehst – ich stelle die richtigen Fragen.',
  buildStartingTitle: 'Ich stehe noch am Anfang',
  buildStartingSub: 'Im Studium oder auf der Suche nach dem ersten Job.',
  buildWorkingTitle: 'Ich arbeite schon',
  buildWorkingSub: 'Ich habe nur nie einen Lebenslauf gebraucht.',
  buildCv: 'Meinen Lebenslauf erstellen',
  probeNext: 'Weiter',
  probeTitle: 'Noch ein paar kurze Fragen.',
  probeLead: 'Beantworte, was du kannst – das macht deinen Lebenslauf stärker. Überspring, was nicht passt.',
  talkStartingTitle: 'Erzähl mir, was du gemacht hast.',
  talkStartingLead:
    'Ein Projekt, Ehrenamt, ein Verein, ein Nebenjob – alles zählt. Schreib einfach alles hierhin, ich bringe es in Form.',
  talkStartingPlaceholder:
    'z. B. Abschlussprojekt – ich habe eine App gebaut, die freie Lernräume auf dem Campus findet. Ich habe das Backend geschrieben und unsere wöchentlichen Standups geleitet.',
  talkWorkingTitle: 'Dein letzter Job.',
  talkWorkingLead:
    'Wo du gearbeitet hast, was du gemacht hast, worauf du stolz bist – erzähl einfach, ich forme daraus deinen Lebenslauf.',
  talkWorkingPlaceholder:
    'z. B. Ich habe 3 Jahre lang ein 6-köpfiges Team bei Kordo Logistics geleitet. Ich habe den Wochenend-Schichtplan überarbeitet, sodass wir nicht mehr unterbesetzt waren, und neue Mitarbeitende eingearbeitet.',
  back: 'Zurück',
  welcomeLoginLink: 'Schon ein Konto? Anmelden',
  loginTitle: 'Willkommen zurück.',
  loginLead: 'Gib deine E-Mail ein — wir schicken dir einen 6-stelligen Code.',

  welcomeTitle: 'Bringen wir dich auf die Shortlist.',
  welcomeLead:
    'Erstelle einmal dein Karriereprofil. Shortlisted verwendet deine Angaben und Antworten in Bewerbungen wieder. Vor dem Absenden prüfst du alles.',
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
  buildingTitle: 'Dein Profil wird eingerichtet…',
  buildingLead: 'Fast fertig — nur ein paar Sekunden.',
  pastePlaceholder: '…oder füge hier deinen Lebenslauf-Text ein.',
  buildProfile: 'Profil erstellen',
  reviewTitle: 'Stimmt das so?',
  reviewLead: (roles: number, skills: number) =>
    `${roles} ${roles === 1 ? 'Stelle' : 'Stellen'} und ${skills} Skills gefunden. Korrigiere, was nicht stimmt — alles lässt sich später noch ändern.`,
  looksRight: 'Passt so',

  answersTitle: 'Noch ein paar Basics.',
  jobTypeLabel: 'Wonach suchst du?',
  jobTypePlaceholder: 'Vollzeit, Praktikum, Freelance…',
  answersLead: 'Einmal hier beantworten, nie wieder in einer Bewerbung.',
  salaryLabel: 'Gehaltsvorstellung',
  salaryPlaceholder: '"4.000 €/Monat" oder "Verhandelbar"',
  noticeLabel: 'Wann kannst du anfangen?',
  noticePlaceholder: '"Sofort" oder "2 Wochen Kündigungsfrist"',
  sponsorshipLabel: 'Brauchst du Visa-Sponsoring?',
  sponsorshipPlaceholder: '"Nein — Remote-Freelancer"',
  continue: 'Weiter',

  verifyTitle: 'Erstelle dein Konto.',
  verifyLead:
    'Ein Code und du bist drin — deine Daten in deinem Konto und deine kostenlosen KI-Credits freigeschaltet.',
  emailPlaceholder: 'du@beispiel.de',
  sendCode: 'Code senden',
  sending: 'Wird gesendet…',
  inboxTitle: 'Schau in dein Postfach.',
  inboxLead: (email: string) =>
    `Wir haben einen 6-stelligen Code an ${email} geschickt. Gib ihn unten ein, um fertig zu werden.`,
  codeLabel: 'Code',
  codePlaceholder: '123456',
  verifyStart: 'Bestätigen & loslegen',
  checking: 'Wird geprüft…',
  resendCode: 'Code erneut senden',
  changeEmail: 'E-Mail ändern',
}
