import type { tLocale } from '../en'

export const questions: tLocale['questions'] = {
  title: 'Réponses',
  hint: 'Répondez une fois, la réponse est réutilisée sur chaque candidature qui la pose — quelle que soit la formulation.',
  fromThisJob: 'de cette offre',
  yourAnswerPlaceholder: 'Votre réponse…',
  emptyState: 'Remplissez une candidature — chaque question sans réponse atterrit ici, une seule fois.',
  timesUsed: (n: number) => `${n}×`,
}
