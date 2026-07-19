import type { tLocale } from '../en'

export const questions: tLocale['questions'] = {
  title: 'Was ich über dich weiß',
  hint:
    'Alles, was du mir beigebracht hast — wiederverwendet in jeder Bewerbung, egal wie gefragt wird. Ich glätte die Formulierung; die Fakten bleiben deine.',
  askedAs: (q: string) => `Gefragt als: „${q}“`,
  fromThisJob: 'aus diesem Job',
  yourAnswerPlaceholder: 'Deine Antwort…',
  emptyState: 'Füll eine Bewerbung aus — jede Frage, die ich nicht beantworten kann, landet hier. Einmal.',
  timesUsed: (n: number) => `${n}×`,
}
