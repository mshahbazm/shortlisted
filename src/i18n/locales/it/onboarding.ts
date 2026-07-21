import type { tLocale } from '../en'

export const onboarding: tLocale['onboarding'] = {
  // No-CV guided builder
  buildTitle: 'Creiamo il tuo CV insieme.',
  buildLead: 'Dimmi a che punto sei e ti farò le domande giuste.',
  buildStartingTitle: 'Sto iniziando ora',
  buildStartingSub: 'Studio, o cerco il primo lavoro.',
  buildWorkingTitle: 'Ho già lavorato',
  buildWorkingSub: 'Solo che non ho mai avuto bisogno di un CV.',
  buildCv: 'Crea il mio CV',
  probeNext: 'Avanti',
  probeTitle: 'Un paio di domande veloci.',
  probeLead: 'Rispondi a quello che puoi: rendono il CV più forte. Salta quelle che non ti riguardano.',
  talkStartingTitle: 'Raccontami cosa hai fatto.',
  talkStartingLead:
    'Un progetto, volontariato, un club, un lavoro part-time: tutto conta. Scrivi tutto qui e io gli do forma.',
  talkStartingPlaceholder:
    "es. Progetto di tesi: ho creato un'app per trovare aule studio libere nel campus. Ho scritto il backend e gestito i nostri standup settimanali.",
  talkWorkingTitle: 'Il tuo lavoro più recente.',
  talkWorkingLead:
    'Dove hai lavorato, cosa facevi, di cosa vai fiero: raccontamelo e io ne faccio il tuo CV.',
  talkWorkingPlaceholder:
    'es. Ho guidato un team di 6 persone alla Kordo Logistics per 3 anni. Ho rivisto i turni del weekend per non restare mai a corto di personale e formato i nuovi arrivati.',
  back: 'Indietro',
  welcomeLoginLink: 'Hai già un account? Accedi',
  loginTitle: 'Ciao di nuovo.',
  loginLead: 'Inserisci la tua email — ti inviamo un codice a 6 cifre.',

  welcomeTitle: 'Facciamoci notare.',
  welcomeLead:
    'Crea il tuo profilo professionale una sola volta. Shortlisted riutilizza i tuoi dati e le tue risposte nelle candidature. Tu controlli tutto prima di inviare.',
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
  buildingTitle: 'Sto preparando il tuo profilo…',
  buildingLead: 'Quasi fatto — pochi secondi.',
  pastePlaceholder: '…oppure incolla qui il testo del tuo CV.',
  buildProfile: 'Crea il mio profilo',
  reviewTitle: 'Ho capito bene?',
  reviewLead: (roles: number, skills: number) =>
    `Trovat${roles === 1 ? 'o 1 ruolo' : `i ${roles} ruoli`} e ${skills} competenze. Correggi quello che non torna — il resto lo modifichi quando vuoi.`,
  looksRight: 'Tutto giusto',

  answersTitle: 'Due informazioni rapide.',
  jobTypeLabel: 'Cosa cerchi?',
  jobTypePlaceholder: 'Tempo pieno, tirocinio, contratto…',
  answersLead: 'Rispondi una volta qui, mai più in una candidatura.',
  salaryLabel: 'Aspettativa di stipendio',
  salaryPlaceholder: '"4.000 $/mese" o "Da discutere"',
  noticeLabel: 'Quando puoi iniziare?',
  noticePlaceholder: '"Subito" o "2 settimane di preavviso"',
  sponsorshipLabel: 'Ti serve una sponsorizzazione per il visto?',
  sponsorshipPlaceholder: '"No — collaboratore da remoto"',
  continue: 'Continua',

  verifyTitle: 'Crea il tuo account.',
  verifyLead:
    'Un codice e sei dentro — i tuoi dati nel tuo account e i crediti AI gratuiti sbloccati.',
  emailPlaceholder: 'tu@esempio.com',
  sendCode: 'Invia codice',
  sending: 'Invio…',
  inboxTitle: 'Controlla la posta.',
  inboxLead: (email: string) =>
    `Abbiamo inviato un codice a 6 cifre a ${email}. Inseriscilo qui sotto per finire.`,
  codeLabel: 'Codice',
  codePlaceholder: '123456',
  verifyStart: 'Verifica e inizia',
  checking: 'Verifica…',
  resendCode: 'Reinvia codice',
  changeEmail: 'Cambia email',
}
