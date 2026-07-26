import type { tLocale } from '../en'
import { plural } from './plural'

export const profile: tLocale['profile'] = {
  hint: 'Wszystko, co rozszerzenie wypełnia, bierze się stąd.',

  city: 'Miasto',
  headline: 'Nagłówek',
  summary: 'Podsumowanie',
  skills: 'Umiejętności',
  industries: 'Branże',

  website: 'Strona WWW',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  portfolio: 'Portfolio',

  company: 'Firma',
  workHighlights: 'Osiągnięcia — jedno na linię, prawdziwe i konkretne',

  degree: 'Tytuł / stopień',
  fieldOfStudy: 'Kierunek',
  school: 'Uczelnia',

  salaryHourly: 'Stawka godzinowa',
  salaryMonthly: 'Wynagrodzenie miesięczne',
  noticeDays: 'Wypowiedzenie (dni)',
  noticeDaysHint: '0 = od zaraz',
  yearsOfExperience: 'Lata doświadczenia',
  timezone: 'Strefa czasowa',
  relocation: 'Relokacja',
  hoursOverlap: 'Wspólne godziny pracy',
  englishLevel: 'Poziom angielskiego',

  tellMeFinishJob: (company: string) =>
    `Dodaj stanowisko i daty dla ${company}, aby dopasowane CV nie pokazywało luki.`,
  workNeedsDetail:
    'Brakuje stanowiska i daty rozpoczęcia — dopasowane CV odczyta to jako lukę.',
  tellMeNoSuchJob:
    'Nie udało się powiązać tego z żadną pracą — najpierw dodaj tę pracę w sekcji Doświadczenie, a potem mi o niej powiedz.',
  uploadPdf: 'Prześlij PDF',
  reading: 'Czytam…',
  answerBankTitle: 'Baza odpowiedzi',
  reimportMergeReviewBody: (count: number) =>
    `Znaleziono ${count === 1 ? '1 nowy element' : `${count} nowych elementów`} w tym CV. Usuń, czego nie chcesz, i dodaj resztę.`,
  sex: 'Płeć',
  drivingLicence: 'Prawo jazdy',
  additionalInfo: 'Dodatkowe informacje',
  communicationSkills: 'Umiejętności komunikacyjne',
  organisationalSkills: 'Umiejętności organizacyjne',
  digitalSkills: 'Umiejętności cyfrowe',
  jobType: 'Typ pracy',
  oneCredit: '1 kredyt',
  segUnanswered: 'Bez odpowiedzi',
  photo: "Zdjęcie",
  manageProfileOnWeb: 'Edytuj profil w przeglądarce →',
}
