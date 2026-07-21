import type { tLocale } from '../en'

export const settings: tLocale['settings'] = {
  title: 'Instellingen',
  hint: 'Invullen werkt zonder setup. Je account ontgrendelt AI — cv-import, cv op maat en fit-scores.',

  languageTitle: 'Taal',
  languageAuto: 'Automatisch (browsertaal)',

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
  checkCredits: 'Mijn credits checken',
  planFree: 'Gratis',
  planPro: 'Pro',
  signOutDevice: 'Uitloggen op dit apparaat',

  backupTitle: 'Back-up',
  backupSummary: 'alles exporteren / importeren',
  exportJson: 'JSON exporteren',
  importJson: 'JSON importeren',
  imported: 'Geïmporteerd.',
  importFailed: (msg: string) => `Importeren mislukt: ${msg}`,

  detectOn: 'aan — alle sites',
  detectOff: 'uit — alleen bekende vacaturesites',
  detectHint:
    'Shortlisted let op alle sites op sollicitatieformulieren en verschijnt zodra het er een herkent. Pagina’s worden op je eigen computer bekeken en er wordt niets verstuurd. Zet dit uit om het te beperken tot de vacaturesites die we direct ondersteunen.',
  detectToggle: 'Sollicitatieformulieren op elke site herkennen',

  serverTitle: 'Cloudserver',
  serverDevHint:
    'Dit is een uitgepakte ontwikkelbuild, dus hij praat met je lokale server. Wijzig dit alleen als je server ergens anders draait.',
  serverProdHint:
    'Verbonden met Shortlisted Cloud. Laat dit leeg, tenzij je gevraagd is het elders heen te wijzen.',
  serverUrlLabel: 'Server-URL',
  serverReset: 'Standaard gebruiken',
  creditsLeft: 'Credits over',
  creditsOf: 'van',
  goPro: 'Ga Pro — 100 credits per maand',
  proFoot: '$9 per maand. Eén cv op maat of één score kost 1 credit. Formulieren invullen is altijd gratis.',
  whereILook: 'Waar ik naar formulieren zoek',
}
