import type { tLocale } from '../en'
import { plural } from './plural'

export const onboarding: tLocale['onboarding'] = {
  back: '← Wstecz',
  welcomeLoginLink: 'Masz już konto? Zaloguj się',
  loginTitle: 'Witaj z powrotem.',
  loginLead: 'Podaj swój e-mail — wyślemy Ci 6-cyfrowy kod.',

  welcomeTitle: 'Czas trafić na shortlistę.',
  welcomeLead:
    'Opowiedz o sobie raz. Potem każda aplikacja wypełni się sama — Ty tylko sprawdzasz i klikasz „wyślij”.',
  importCvTitle: 'Mam CV',
  importCvSub: 'Prześlij lub wklej CV — AI zamieni je w Twój profil. ~1 minuta.',
  startBlankTitle: 'Nie mam CV',
  startBlankSub: 'Nic nie szkodzi — w środku pomożemy Ci zbudować profil i dopracowane CV.',

  pasteTitle: 'Poproszę Twoje CV.',
  pasteLead: 'Prześlij PDF albo wklej tekst.',
  uploadPdf: 'Wgraj PDF',
  uploadSubIdle: 'AI go odczyta i zbuduje Twój profil.',
  readingCv: 'Czytam Twoje CV…',
  readingCloudSub: 'Wyciągam Twój profil — to zajmie chwilę.',
  pastePlaceholder: '…albo wklej tutaj tekst swojego CV.',
  buildProfile: 'Zbuduj mój profil',
  reviewTitle: 'Zgadza się?',
  reviewLead: (roles: number, skills: number) =>
    `Mam ${roles} ${plural(roles, 'stanowisko', 'stanowiska', 'stanowisk')} i ${skills} ${plural(
      skills,
      'umiejętność',
      'umiejętności',
      'umiejętności',
    )}. Popraw, co się nie zgadza — resztę możesz edytować później.`,
  looksRight: 'Zgadza się',

  answersTitle: 'Trzy pytania z każdej rekrutacji.',
  answersLead: 'Odpowiedz raz tutaj — i nigdy więcej w żadnej aplikacji.',
  salaryLabel: 'Oczekiwania finansowe',
  salaryPlaceholder: '„4000 $/mies.” albo „Do uzgodnienia”',
  noticeLabel: 'Kiedy możesz zacząć?',
  noticePlaceholder: '„Od zaraz” albo „2 tygodnie wypowiedzenia”',
  sponsorshipLabel: 'Potrzebujesz sponsorowania wizy?',
  sponsorshipPlaceholder: '„Nie — zdalny kontraktor”',
  continue: 'Dalej',

  verifyTitle: 'Ostatnia rzecz — potwierdź e-mail.',
  verifyLead:
    'Jeden kod i gotowe: kopia zapasowa profilu, darmowe kredyty AI, a gdy zechcesz — darmowa strona profilu na Shortlisted.',
  emailPlaceholder: 'ty@przyklad.pl',
  sendCode: 'Wyślij kod',
  sending: 'Wysyłanie…',
  inboxTitle: 'Sprawdź skrzynkę.',
  inboxLead: (email: string) =>
    `Wysłaliśmy 6-cyfrowy kod na ${email}. Wpisz go tutaj i gotowe — potem otwórz dowolne ogłoszenie i kliknij „Wypełnij tę aplikację”.`,
  codeLabel: 'Kod',
  codePlaceholder: '123456',
  verifyStart: 'Potwierdź i zaczynamy',
  checking: 'Sprawdzanie…',
  resendCode: 'Wyślij kod ponownie',
  changeEmail: 'Zmień e-mail',
}
