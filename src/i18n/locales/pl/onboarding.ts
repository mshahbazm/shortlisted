import type { tLocale } from '../en'
import { plural } from './plural'

export const onboarding: tLocale['onboarding'] = {
  // No-CV guided builder
  buildTitle: 'Stwórzmy razem Twój profil.',
  buildLead: 'Wybierz, na jakim jesteś etapie, a pytania się dopasują.',
  buildStartingTitle: 'Dopiero zaczynam',
  buildStartingSub: 'Studiuję albo szukam pierwszej pracy.',
  buildWorkingTitle: 'Już pracuję',
  buildWorkingSub: 'Po prostu nigdy nie potrzebowałem/-am CV.',
  buildHaveResumeTitle: 'Mam już CV',
  buildHaveResumeSub: 'Prześlij je — zamienimy je w Twój profil.',
  buildCv: 'Utwórz moje CV',
  probeNext: 'Dalej',
  probeTitle: 'Kilka szybkich pytań.',
  probeLead: 'Odpowiedz na co możesz – dzięki temu CV będzie mocniejsze. Pomiń te, które nie pasują.',
  talkStartingTitle: 'Co robiłeś/-aś?',
  talkStartingLead:
    'Projekt, wolontariat, koło, praca dorywcza – wszystko się liczy. Wrzuć tu wszystko, a powstanie z tego CV.',
  talkStartingPlaceholder:
    'np. Projekt dyplomowy: zbudowałem/-am aplikację do znajdowania wolnych sal do nauki na kampusie. Napisałem/-am backend i prowadziłem/-am nasze cotygodniowe spotkania.',
  talkWorkingTitle: 'Twoja ostatnia praca.',
  talkWorkingLead:
    'Gdzie pracowałeś/-aś, co robiłeś/-aś, z czego jesteś dumny/-a – po prostu pisz swobodnie, a powstanie z tego CV.',
  talkWorkingPlaceholder:
    'np. Przez 3 lata kierowałem/-am 6-osobowym zespołem w Kordo Logistics. Poprawiłem/-am grafik weekendowy, żeby nie brakowało nam ludzi, i szkoliłem/-am nowych.',
  talkCountNeed: (n: number, min: number) => `${n} / ${min} znaków — jeszcze trochę`,
  talkCountReady: 'Im więcej podasz, tym lepsze CV — projekty, sukcesy, cokolwiek.',
  back: 'Wstecz',
  skip: 'Pomiń',
  nameTitle: "Miło Cię poznać.",
  nameLead:
    "Twoje imię trafi na CV. E-mail jest po to, żebyśmy mogli napisać, co nowego — i czasem zapytać, jak Ci idzie.",
  emailLabel: "E-mail",
  emailPlaceholder: "ty@przyklad.pl",
  emailWhy:
    "Nowości i od czasu do czasu pytanie, nic więcej. To nie jest konto — nie ma się gdzie logować, a Twoje CV i odpowiedzi zostają na tym komputerze.",
  emailSkip: "Dalej bez tego",

  welcomeTitle: 'Czas trafić na shortlistę.',
  welcomeLead:
    "Utwórz profil zawodowy raz, a Shortlisted użyje Twoich danych i odpowiedzi w każdej aplikacji — wszystko sprawdzasz przed wysłaniem. Twoje CV, odpowiedzi i historia pracy zostają na tym komputerze.",
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
  linkedin: 'LinkedIn',
  github: 'GitHub',
  portfolio: 'Portfolio',
  linkedinPlaceholder: 'linkedin.com/in/you',
  githubPlaceholder: 'github.com/you',
  portfolioPlaceholder: 'yoursite.com',

  answersTitle: 'Kilka szybkich podstaw.',
  jobTypeLabel: 'Czego szukasz?',
  jobTypeFullTime: 'Pełny etat',
  jobTypePartTime: 'Część etatu',
  jobTypeContract: 'Kontrakt',
  jobTypeInternship: 'Staż',
  jobTypeFreelance: 'Freelance',
  jobTypeOpenToAny: 'Otwarte na wszystko',
  answersLead: 'Odpowiedz raz tutaj — i nigdy więcej w żadnej aplikacji.',
  salaryHourlyLabel: 'Stawka godzinowa',
  salaryHourlyPlaceholder: 'np. 25',
  salaryMonthlyLabel: 'Wynagrodzenie miesięczne',
  salaryMonthlyPlaceholder: 'np. 4000',
  noticeDaysLabel: 'Kiedy możesz zacząć? (dni)',
  noticeDaysHint: '0 = od razu',
  continue: 'Dalej',

  checking: 'Chwileczkę…',
}
