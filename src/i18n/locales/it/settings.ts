import type { tLocale } from '../en'

export const settings: tLocale['settings'] = {
  title: 'Impostazioni',
  hint: 'La compilazione funziona senza configurazione. Il tuo account sblocca l’IA — import del CV, adattamento, punteggi di fit.',

  languageTitle: 'Lingua',
  languageAuto: 'Automatica (lingua del browser)',

  accountTitle: 'Account',
  notSignedIn: 'non connesso',
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
  signedInAs: (email: string) => `Connesso come ${email}`,
  checkCredits: 'Controlla i miei crediti',
  usageLine: (plan: string, used: number, limit: number, monthly: boolean) =>
    `${plan} · ${used} crediti su ${limit} usati${monthly ? ' questo mese' : ' (totali)'}`,
  planFree: 'Free',
  planPro: 'Pro',
  signOutDevice: 'Esci su questo dispositivo',

  backupTitle: 'Backup',
  backupSummary: 'esporta / importa tutto',
  exportJson: 'Esporta JSON',
  importJson: 'Importa JSON',
  imported: 'Importato.',
  importFailed: (msg: string) => `Import fallito: ${msg}`,

  detectTitle: 'Rilevamento offerte',
  detectOn: 'tutti i siti',
  detectOff: 'solo portali noti',
  detectHint:
    'Di norma il pannello compare solo sui portali di lavoro che conosciamo. Attiva questa opzione e Shortlisted cerca moduli di candidatura anche su altri siti, comparendo quando è sicuro. Le pagine vengono analizzate sul tuo computer: non viene inviato nulla.',
  detectToggle: 'Cercare moduli di candidatura su tutti i siti',
  detectDeclined: 'Non attivato: Chrome richiede l’accesso a tutti i siti.',
}
