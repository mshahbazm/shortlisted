import type { tLocale } from '../en'

export const settings: tLocale['settings'] = {
  title: 'Ustawienia',
  hint: 'Wypełnianie działa bez konfiguracji. Konto odblokowuje AI — import CV, dopasowywanie i oceny dopasowania.',

  languageTitle: 'Język',
  languageAuto: 'Automatycznie (język przeglądarki)',

  accountTitle: 'Konto',
  notSignedIn: 'niezalogowano',
  accountIntro:
    'Zaloguj się e-mailem, aby odblokować AI i trzymać swoje dane na koncie. Free: 10 kredytów. Pro (9 $/mies.): 100 kredytów miesięcznie. Jedno dopasowane CV ≈ 1 kredyt.',
  emailPlaceholder: 'ty@przyklad.pl',
  sendCode: 'Wyślij mi kod',
  sending: 'Wysyłanie…',
  codeSent: 'Kod wysłany — sprawdź pocztę.',
  codeLabel: '6-cyfrowy kod z Twojego e-maila',
  codePlaceholder: '123456',
  signIn: 'Zaloguj się',
  checking: 'Sprawdzanie…',
  resendCode: 'Wyślij kod ponownie',
  signedIn: 'Zalogowano.',
  signedInAs: (email: string) => `Zalogowano jako ${email}`,
  checkCredits: 'Sprawdź moje kredyty',
  usageLine: (plan: string, used: number, limit: number, monthly: boolean) =>
    `${plan} · zużyto ${used} z ${limit} ${limit === 1 ? 'kredytu' : 'kredytów'}${
      monthly ? ' w tym miesiącu' : ' (łącznie)'
    }`,
  planFree: 'Free',
  planPro: 'Pro',
  signOutDevice: 'Wyloguj na tym urządzeniu',

  backupTitle: 'Kopia zapasowa',
  backupSummary: 'eksport / import wszystkiego',
  exportJson: 'Eksportuj JSON',
  importJson: 'Importuj JSON',
  imported: 'Zaimportowano.',
  importFailed: (msg: string) => `Import nie powiódł się: ${msg}`,
}
