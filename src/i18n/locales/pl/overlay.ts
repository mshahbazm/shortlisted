import type { tLocale } from '../en'
import { plural } from './plural'

export const overlay: tLocale['overlay'] = {
  fillApplication: 'Wypełnij tę aplikację',
  fillAgain: 'Wypełnij ponownie',
  idleNote:
    'Wypełnia to, co wie, a o resztę pyta. Ty wszystko sprawdzasz i samodzielnie klikasz „wyślij”.',
  filling: 'Wypełniam…',
  howDoIScore: 'Jak wypadam w tej ofercie?',
  scoringFit: 'Oceniam Twoje dopasowanie…',
  scoringFailed: 'Ocena nie powiodła się.',
  scoringFailedRetry: 'Ocena nie powiodła się — spróbuj ponownie.',
  leadWithHeader: 'Postaw na to',
  gapsHeader: 'Przygotuj się na pytania o',
  languageNotice: (lang: string) => `To ogłoszenie wygląda na napisane w języku: ${lang} — nie ma go w Twoim profilu. Formularz i tak mogę wypełnić.`,
  aiWorking: (n: number) => `AI odpowiada na ${n} ${plural(n, 'pytanie', 'pytania', 'pytań')}…`,
  aiFilledNote: (n: number) => `AI wypełniło ${n} — sprawdź przed wysłaniem.`,
  aiFilled: 'Wypełnione przez AI na podstawie Twoich danych — sprawdź. Zapisz, aby zapamiętać.',
  filledFields: (n: number) => `Wypełniono ${n} ${plural(n, 'pole', 'pola', 'pól')}.`,
  cvAttached: (label: string) => `Dołączono CV: ${label}`,
  attachWhichCv: 'Które CV dołączyć?',
  swap: 'Zmień',
  attach: 'Dołącz',
  fromBankHeader: 'Wypełnione z Twojego banku odpowiedzi — sprawdź je:',
  usedSimilarAnswer: 'Użyto podobnej zapisanej odpowiedzi. Popraw na stronie, jeśli nie pasuje.',
  newQuestionsHeader: 'Nowe pytania — odpowiedz raz, użyjemy zawsze:',
  skippedDemographic: (n: number) =>
    `Zostawiono Ci ${n} ${plural(
      n,
      'pytanie demograficzne/ankietowe',
      'pytania demograficzne/ankietowe',
      'pytań demograficznych/ankietowych',
    )} — na te odpowiadasz ręcznie.`,
  allDone: 'Wszystko, co znane, już wpisane. Przejrzyj stronę i wyślij, kiedy zechcesz.',
  answerPlaceholder: 'Twoja odpowiedź… (zapisze się w Twoim banku)',
  pickOne: 'Wybierz…',
  cvMissing: 'Ta oferta wymaga CV, ale żadne nie jest jeszcze zapisane. Dodaj je raz — będzie dołączane do każdej aplikacji.',
  uploadCv: 'Prześlij CV (PDF)',
  saveAndFill: 'Zapisz i wypełnij',
  saved: 'Zapisano ✓',
}
