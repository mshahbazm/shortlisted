import type { tLocale } from '../en'

export const questions: tLocale['questions'] = {
  title: 'Wat ik over je weet',
  hint:
    'Alles wat je me hebt geleerd — hergebruikt bij elke sollicitatie die ernaar vraagt, in elke bewoording. Ik poets de formulering op; de feiten blijven van jou.',
  askedAs: (q: string) => `Gevraagd als: “${q}”`,
  fromThisJob: 'uit deze vacature',
  yourAnswerPlaceholder: 'Jouw antwoord…',
  emptyState: 'Vul een sollicitatie in — elke vraag die ik niet kan beantwoorden komt hier terecht, één keer.',
  timesUsed: (n: number) => `${n}×`,
}
