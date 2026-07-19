import type { tLocale } from '../en'

export const settings: tLocale['settings'] = {
  title: 'Instellingen',
  hint: 'Invullen werkt zonder setup. Je account ontgrendelt AI — cv-import, cv op maat en fit-scores.',

  languageTitle: 'Taal',
  languageAuto: 'Automatisch (browsertaal)',

  accountTitle: 'Account',
  notSignedIn: 'niet ingelogd',
  accountIntro:
    'Log in met je e-mail om AI te ontgrendelen en je gegevens in je account te bewaren. Gratis: 10 credits. Pro ($9/mnd): 100 credits per maand. Eén cv op maat ≈ 1 credit.',
  emailPlaceholder: 'jij@voorbeeld.nl',
  sendCode: 'Stuur me een code',
  sending: 'Versturen…',
  codeSent: 'Code verstuurd — check je e-mail.',
  codeLabel: 'De 6-cijferige code uit je e-mail',
  codePlaceholder: '123456',
  signIn: 'Inloggen',
  checking: 'Controleren…',
  resendCode: 'Code opnieuw sturen',
  signedIn: 'Ingelogd.',
  signedInAs: (email: string) => `Ingelogd als ${email}`,
  checkCredits: 'Mijn credits checken',
  usageLine: (plan: string, used: number, limit: number, monthly: boolean) =>
    `${plan} · ${used} van ${limit} credits gebruikt${monthly ? ' deze maand' : ' (totaal)'}`,
  planFree: 'Gratis',
  planPro: 'Pro',
  signOutDevice: 'Uitloggen op dit apparaat',

  backupTitle: 'Back-up',
  backupSummary: 'alles exporteren / importeren',
  exportJson: 'JSON exporteren',
  importJson: 'JSON importeren',
  imported: 'Geïmporteerd.',
  importFailed: (msg: string) => `Importeren mislukt: ${msg}`,

  detectTitle: 'Vacaturedetectie',
  detectOn: 'alle sites',
  detectOff: 'alleen bekende vacaturesites',
  detectHint:
    'Standaard verschijnt het paneel alleen op vacaturesites die we kennen. Zet dit aan en Shortlisted kijkt ook op andere sites naar een sollicitatieformulier, en verschijnt als het zeker is. Pagina’s worden op je eigen computer bekeken — er wordt niets verstuurd.',
  detectToggle: 'Op alle sites naar sollicitatieformulieren zoeken',
  detectDeclined: 'Niet aangezet — Chrome heeft hiervoor toegang tot alle sites nodig.',
}
