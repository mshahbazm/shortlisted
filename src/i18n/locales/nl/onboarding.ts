import type { tLocale } from '../en'

export const onboarding: tLocale['onboarding'] = {
  // No-CV guided builder
  buildTitle: 'Laten we samen je profiel maken.',
  buildLead: 'Kies waar je staat, dan passen de vragen zich aan.',
  buildStartingTitle: 'Ik begin net',
  buildStartingSub: 'Studerend, of op zoek naar mijn eerste baan.',
  buildWorkingTitle: 'Ik werk al',
  buildWorkingSub: 'Ik had alleen nooit een cv nodig.',
  buildCv: 'Mijn cv maken',
  probeNext: 'Volgende',
  probeTitle: 'Nog een paar korte vragen.',
  probeLead: 'Beantwoord wat je kunt – zo wordt je cv sterker. Sla over wat niet past.',
  talkStartingTitle: 'Wat heb je gedaan?',
  talkStartingLead:
    'Een project, vrijwilligerswerk, een club, een bijbaan – alles telt. Gooi het hier neer – het wordt je cv.',
  talkStartingPlaceholder:
    'bijv. Afstudeerproject: ik bouwde een app om vrije studieruimtes op de campus te vinden. Ik schreef de backend en leidde onze wekelijkse standups.',
  talkWorkingTitle: 'Je meest recente baan.',
  talkWorkingLead:
    'Waar je werkte, wat je deed, waar je trots op bent – schrijf gewoon vrijuit, het wordt je cv.',
  talkWorkingPlaceholder:
    'bijv. Ik leidde 3 jaar lang een team van 6 bij Kordo Logistics. Ik herzag het weekendrooster zodat we niet meer onderbezet waren, en leidde nieuwe mensen op.',
  talkCountNeed: (n: number, min: number) => `${n} / ${min} tekens — nog even`,
  talkCountReady: 'Hoe meer je deelt, hoe beter je cv — projecten, successen, alles.',
  back: 'Terug',
  skip: 'Overslaan',
  welcomeLoginLink: 'Heb je al een account? Log in',
  loginTitle: 'Welkom terug.',
  loginLead: 'Vul je e-mailadres in — we sturen je een 6-cijferige code.',

  welcomeTitle: 'Zorgen dat jij op de shortlist komt.',
  welcomeLead:
    'Maak je loopbaanprofiel één keer. Shortlisted hergebruikt je gegevens en antwoorden in sollicitaties. Jij controleert alles voordat je verstuurt.',
  importCvTitle: 'Ik heb een cv',
  importCvSub: 'Upload of plak je cv — AI maakt er je profiel van. ~1 minuut.',
  startBlankTitle: 'Ik heb geen cv',
  startBlankSub: 'Geen probleem — we helpen je binnen je profiel en een net cv op te bouwen.',

  pasteTitle: 'Je cv, graag.',
  pasteLead: 'Upload de PDF, of plak de tekst.',
  uploadPdf: 'PDF uploaden',
  uploadSubIdle: 'AI leest hem en bouwt je profiel.',
  readingCv: 'Je cv lezen…',
  readingCloudSub: 'Je profiel wordt opgebouwd — momentje.',
  buildingTitle: 'Je profiel wordt klaargezet…',
  buildingLead: 'Bijna klaar — een paar seconden.',
  pastePlaceholder: '…of plak hier je cv-tekst.',
  buildProfile: 'Bouw mijn profiel',
  reviewTitle: 'Klopt dit zo?',
  reviewLead: (roles: number, skills: number) =>
    `${roles} ${roles === 1 ? 'functie' : 'functies'} en ${skills} vaardigheden gevonden. Verbeter wat niet klopt — de rest kun je later aanpassen.`,
  looksRight: 'Ziet er goed uit',

  answersTitle: 'Nog een paar basics.',
  jobTypeLabel: 'Waar ben je naar op zoek?',
  jobTypePlaceholder: 'Fulltime, stage, freelance…',
  answersLead: 'Beantwoord ze hier één keer, daarna nooit meer.',
  salaryLabel: 'Salarisverwachting',
  salaryPlaceholder: '"€ 4.000/maand" of "In overleg"',
  noticeLabel: 'Wanneer kun je beginnen?',
  noticePlaceholder: '"Per direct" of "2 weken opzegtermijn"',
  sponsorshipLabel: 'Heb je visumsponsoring nodig?',
  sponsorshipPlaceholder: '"Nee — werk remote als contractor"',
  continue: 'Doorgaan',

  verifyTitle: 'Maak je account aan.',
  verifyLead:
    'Eén code en je bent binnen — je gegevens veilig in je account en je gratis AI-credits ontgrendeld.',
  emailPlaceholder: 'jij@voorbeeld.nl',
  sendCode: 'Code versturen',
  sending: 'Versturen…',
  inboxTitle: 'Kijk in je inbox.',
  inboxLead: (email: string) =>
    `We hebben een 6-cijferige code naar ${email} gestuurd. Typ hem hieronder om af te ronden.`,
  codeLabel: 'Code',
  codePlaceholder: '123456',
  verifyStart: 'Bevestigen & starten',
  checking: 'Controleren…',
  resendCode: 'Code opnieuw sturen',
  changeEmail: 'E-mail wijzigen',
}
