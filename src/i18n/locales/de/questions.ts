import type { tLocale } from '../en'

export const questions: tLocale['questions'] = {
  title: 'Antworten',
  hint: 'Einmal beantworten, in jeder Bewerbung wiederverwendet — egal wie die Frage formuliert ist.',
  fromThisJob: 'aus diesem Job',
  yourAnswerPlaceholder: 'Deine Antwort…',
  emptyState: 'Füll eine Bewerbung aus — jede Frage, die ich nicht beantworten kann, landet hier. Einmal.',
  timesUsed: (n: number) => `${n}×`,
}
