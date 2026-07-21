import type { tLocale } from '../en'
import { plural } from './plural'

export const onboarding: tLocale['onboarding'] = {
  // No-CV guided builder
  buildTitle: 'Stwórzmy razem Twoje CV.',
  buildLead: 'Powiedz mi, na jakim jesteś etapie, a zadam właściwe pytania.',
  buildStartingTitle: 'Dopiero zaczynam',
  buildStartingSub: 'Studiuję albo szukam pierwszej pracy.',
  buildWorkingTitle: 'Już pracuję',
  buildWorkingSub: 'Po prostu nigdy nie potrzebowałem/-am CV.',
  buildCv: 'Utwórz moje CV',
  probeNext: 'Dalej',
  probeTitle: 'Kilka szybkich pytań.',
  probeLead: 'Odpowiedz na co możesz – dzięki temu CV będzie mocniejsze. Pomiń te, które nie pasują.',
  talkStartingTitle: 'Opowiedz, co robiłeś/-aś.',
  talkStartingLead:
    'Projekt, wolontariat, koło, praca dorywcza – wszystko się liczy. Wrzuć tu wszystko, a ja nadam temu formę.',
  talkStartingPlaceholder:
    'np. Projekt dyplomowy: zbudowałem/-am aplikację do znajdowania wolnych sal do nauki na kampusie. Napisałem/-am backend i prowadziłem/-am nasze cotygodniowe spotkania.',
  talkWorkingTitle: 'Twoja ostatnia praca.',
  talkWorkingLead:
    'Gdzie pracowałeś/-aś, co robiłeś/-aś, z czego jesteś dumny/-a – po prostu opowiedz, a ja zrobię z tego Twoje CV.',
  talkWorkingPlaceholder:
    'np. Przez 3 lata kierowałem/-am 6-osobowym zespołem w Kordo Logistics. Poprawiłem/-am grafik weekendowy, żeby nie brakowało nam ludzi, i szkoliłem/-am nowych.',
  back: 'Wstecz',
  welcomeLoginLink: 'Masz już konto? Zaloguj się',
  loginTitle: 'Witaj z powrotem.',
  loginLead: 'Podaj swój e-mail — wyślemy Ci 6-cyfrowy kod.',

  welcomeTitle: 'Czas trafić na shortlistę.',
  welcomeLead:
    'Utwórz swój profil zawodowy raz. Shortlisted ponownie wykorzystuje Twoje dane i odpowiedzi w aplikacjach o pracę. Przed wysłaniem sprawdzasz wszystko.',
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
  buildingTitle: 'Przygotowujemy Twój profil…',
  buildingLead: 'Prawie gotowe — kilka sekund.',
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

  answersTitle: 'Kilka szybkich podstaw.',
  jobTypeLabel: 'Czego szukasz?',
  jobTypePlaceholder: 'Pełny etat, staż, kontrakt…',
  answersLead: 'Odpowiedz raz tutaj — i nigdy więcej w żadnej aplikacji.',
  salaryLabel: 'Oczekiwania finansowe',
  salaryPlaceholder: '„4000 $/mies.” albo „Do uzgodnienia”',
  noticeLabel: 'Kiedy możesz zacząć?',
  noticePlaceholder: '„Od zaraz” albo „2 tygodnie wypowiedzenia”',
  sponsorshipLabel: 'Potrzebujesz sponsorowania wizy?',
  sponsorshipPlaceholder: '„Nie — zdalny kontraktor”',
  continue: 'Dalej',

  verifyTitle: 'Załóż konto.',
  verifyLead:
    'Jeden kod i gotowe — Twoje dane na Twoim koncie i darmowe kredyty AI odblokowane.',
  emailPlaceholder: 'ty@przyklad.pl',
  sendCode: 'Wyślij kod',
  sending: 'Wysyłanie…',
  inboxTitle: 'Sprawdź skrzynkę.',
  inboxLead: (email: string) =>
    `Wysłaliśmy 6-cyfrowy kod na ${email}. Wpisz go poniżej, aby zakończyć.`,
  codeLabel: 'Kod',
  codePlaceholder: '123456',
  verifyStart: 'Potwierdź i zaczynamy',
  checking: 'Sprawdzanie…',
  resendCode: 'Wyślij kod ponownie',
  changeEmail: 'Zmień e-mail',
}
