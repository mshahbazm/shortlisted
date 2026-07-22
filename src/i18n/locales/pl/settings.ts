import type { tLocale } from '../en'

export const settings: tLocale['settings'] = {
  title: 'Ustawienia',
  hint: 'Wypełnianie działa bez konfiguracji. Konto odblokowuje AI — import CV, dopasowywanie i oceny dopasowania.',

  languageTitle: 'Język',
  languageAuto: 'Automatycznie (język przeglądarki)',

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
  checkCredits: 'Sprawdź moje kredyty',
  planFree: 'Free',
  planPro: 'Pro',
  signOutDevice: 'Wyloguj na tym urządzeniu',

  backupTitle: 'Kopia zapasowa',
  backupSummary: 'eksport / import wszystkiego',
  exportJson: 'Eksportuj JSON',
  importJson: 'Importuj JSON',
  imported: 'Zaimportowano.',
  importFailed: (msg: string) => `Import nie powiódł się: ${msg}`,

  detectOn: 'włączone — wszystkie strony',
  detectOff: 'wyłączone — tylko znane portale',
  detectHint:
    'Shortlisted wypatruje formularzy aplikacyjnych na wszystkich stronach i pojawia się, gdy rozpozna taki formularz. Strony są sprawdzane na Twoim komputerze i nic nie jest wysyłane. Wyłącz, aby ograniczyć działanie do bezpośrednio obsługiwanych portali.',
  detectToggle: 'Rozpoznawaj formularze aplikacyjne na każdej stronie',

  creditsLeft: 'Pozostałe kredyty',
  creditsOf: 'z',
  goPro: 'Przejdź na Pro — 100 kredytów miesięcznie',
  proMonthly: 'Pro miesięcznie — 15 $/mies.',
  proAnnual: 'Pro rocznie — 150 $/rok',
  proFoot: '1 $ przez pierwsze 7 dni, potem 15 $/mies. 100 kredytów miesięcznie; wypełnianie formularzy zawsze za darmo.',
  manageSub: 'Zarządzaj subskrypcją',
  historyTitle: 'Historia kredytów',
  historySummary: 'przyznania, wydatki, miesięczne resety',
  historyHint: 'Każdy przyznany, wydany i zresetowany kredyt — pełna historia.',
  historyEmpty: 'Brak aktywności kredytowej.',
  whereILook: 'Gdzie szukam formularzy',
}
