import type { tLocale } from '../en'

export const settings: tLocale['settings'] = {
  title: 'Impostazioni',
  hint: 'La compilazione funziona senza configurazione. Il tuo account sblocca l’IA — import del CV, adattamento, punteggi di fit.',

  languageTitle: 'Lingua',
  languageAuto: 'Automatica (lingua del browser)',

  accountIntro:
    'Accedi con la tua email per sbloccare l’IA e tenere i tuoi dati nel tuo account. Free: 10 crediti. Pro (9 $/mese): 100 crediti al mese. Un CV adattato ≈ 1 credito.',
  emailPlaceholder: 'tu@esempio.com',
  sendCode: 'Inviami un codice',
  sending: 'Invio…',
  codeSent: 'Codice inviato — controlla la tua email.',
  codeLabel: 'Il codice a 6 cifre della tua email',
  codePlaceholder: '123456',
  signIn: 'Accedi',
  checking: 'Verifica…',
  resendCode: 'Reinvia il codice',
  signedIn: 'Accesso effettuato.',
  checkCredits: 'Controlla i miei crediti',
  planFree: 'Free',
  planPro: 'Pro',
  signOutDevice: 'Esci su questo dispositivo',

  backupTitle: 'Backup',
  backupSummary: 'esporta / importa tutto',
  exportJson: 'Esporta JSON',
  importJson: 'Importa JSON',
  imported: 'Importato.',
  importFailed: (msg: string) => `Import fallito: ${msg}`,

  detectOn: 'attivo — tutti i siti',
  detectOff: 'disattivo — solo portali noti',
  detectHint:
    'Shortlisted cerca moduli di candidatura su tutti i siti e compare quando ne riconosce uno. Le pagine vengono analizzate sul tuo computer e non viene inviato nulla. Disattivalo per limitarlo ai portali che supportiamo direttamente.',
  detectToggle: 'Riconoscere i moduli di candidatura su qualsiasi sito',

  creditsLeft: 'Crediti rimasti',
  creditsOf: 'di',
  goPro: 'Passa a Pro — 100 crediti al mese',
  proFoot: '9 $ al mese. Un CV su misura o un punteggio costa 1 credito. Compilare moduli è sempre gratis.',
  whereILook: 'Dove cerco i moduli',
}
