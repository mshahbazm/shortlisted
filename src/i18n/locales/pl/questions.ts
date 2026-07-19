import type { tLocale } from '../en'

export const questions: tLocale['questions'] = {
  title: 'Co o Tobie wiem',
  hint:
    'Wszystko, czego mnie nauczysz — używane w każdej aplikacji, która o to zapyta, niezależnie od sformułowania. Szlifuję formę; fakty pozostają Twoje.',
  askedAs: (q: string) => `Pytanie brzmiało: „${q}”`,
  fromThisJob: 'z tej oferty',
  yourAnswerPlaceholder: 'Twoja odpowiedź…',
  emptyState: 'Wypełnij jakąś aplikację — każde pytanie, którego nie znam, trafia tutaj. Raz.',
  timesUsed: (n: number) => `${n}×`,
}
