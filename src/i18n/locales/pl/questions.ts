import type { tLocale } from '../en'

export const questions: tLocale['questions'] = {
  title: 'Odpowiedzi',
  hint: 'Odpowiedz raz — użyjemy jej w każdej aplikacji z tym pytaniem, niezależnie od sformułowania.',
  fromThisJob: 'z tej oferty',
  yourAnswerPlaceholder: 'Twoja odpowiedź…',
  emptyState: 'Wypełnij jakąś aplikację — każde pytanie, którego nie znam, trafia tutaj. Raz.',
  timesUsed: (n: number) => `${n}×`,
}
