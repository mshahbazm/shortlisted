import type { tLocale } from '../en'

export const questions: tLocale['questions'] = {
  title: 'Antwoorden',
  hint: 'Eén keer beantwoorden, hergebruikt bij elke sollicitatie die het vraagt — in welke bewoording dan ook.',
  fromThisJob: 'uit deze vacature',
  yourAnswerPlaceholder: 'Jouw antwoord…',
  emptyState: 'Vul een sollicitatie in — elke vraag die ik niet kan beantwoorden komt hier terecht, één keer.',
  timesUsed: (n: number) => `${n}×`,
}
