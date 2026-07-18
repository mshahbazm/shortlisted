import type { tLocale } from '../en'

export const onboarding: tLocale['onboarding'] = {
  back: '← Indietro',
  welcomeLoginLink: 'Hai già un account? Accedi',
  loginTitle: 'Ciao di nuovo.',
  loginLead: 'Inserisci la tua email — ti inviamo un codice a 6 cifre.',

  welcomeTitle: 'Facciamoci notare.',
  welcomeLead:
    'Raccontami di te una volta sola. Poi ogni candidatura si compila da sola — tu controlli e clicchi invia.',
  importCvTitle: 'Ho un CV',
  importCvSub: 'Carica o incolla il tuo CV — l\'IA lo trasforma nel tuo profilo. ~1 minuto.',
  startBlankTitle: 'Non ho un CV',
  startBlankSub: 'Nessun problema — dentro ti aiutiamo a creare il tuo profilo e un CV curato.',

  pasteTitle: 'Il tuo CV, per favore.',
  pasteLead: 'Carica il PDF o incolla il testo.',
  uploadPdf: 'Carica PDF',
  uploadSubIdle: 'L\'IA lo legge e crea il tuo profilo.',
  readingCv: 'Sto leggendo il tuo CV…',
  readingCloudSub: 'Sto estraendo il tuo profilo — un attimo.',
  pastePlaceholder: '…oppure incolla qui il testo del tuo CV.',
  buildProfile: 'Crea il mio profilo',
  reviewTitle: 'Ho capito bene?',
  reviewLead: (roles: number, skills: number) =>
    `Trovat${roles === 1 ? 'o 1 ruolo' : `i ${roles} ruoli`} e ${skills} competenze. Correggi quello che non torna — il resto lo modifichi quando vuoi.`,
  looksRight: 'Tutto giusto',

  answersTitle: 'Tre domande che fanno tutti.',
  answersLead: 'Rispondi una volta qui, mai più in una candidatura.',
  salaryLabel: 'Aspettativa di stipendio',
  salaryPlaceholder: '"4.000 $/mese" o "Da discutere"',
  noticeLabel: 'Quando puoi iniziare?',
  noticePlaceholder: '"Subito" o "2 settimane di preavviso"',
  sponsorshipLabel: 'Ti serve una sponsorizzazione per il visto?',
  sponsorshipPlaceholder: '"No — collaboratore da remoto"',
  continue: 'Continua',

  verifyTitle: 'Ultima cosa — verifica la tua email.',
  verifyLead:
    'Un codice e sei dentro: profilo salvato, crediti AI gratis sbloccati, e la tua pagina profilo Shortlisted gratuita quando la vorrai.',
  emailPlaceholder: 'tu@esempio.com',
  sendCode: 'Invia codice',
  sending: 'Invio…',
  inboxTitle: 'Controlla la posta.',
  inboxLead: (email: string) =>
    `Abbiamo inviato un codice a 6 cifre a ${email}. Digitalo qui e hai finito — poi apri un annuncio qualsiasi e premi "Compila questa candidatura".`,
  codeLabel: 'Codice',
  codePlaceholder: '123456',
  verifyStart: 'Verifica e inizia',
  checking: 'Verifica…',
  resendCode: 'Reinvia codice',
  changeEmail: 'Cambia email',
}
