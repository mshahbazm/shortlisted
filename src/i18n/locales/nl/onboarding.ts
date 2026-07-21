import type { tLocale } from '../en'

export const onboarding: tLocale['onboarding'] = {
  back: '← Terug',
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

  answersTitle: 'Drie vragen die elke werkgever stelt.',
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
