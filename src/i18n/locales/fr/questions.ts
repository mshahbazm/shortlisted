import type { tLocale } from '../en'

export const questions: tLocale['questions'] = {
  title: 'Ce que je sais de vous',
  hint:
    'Tout ce que vous m’avez appris — réutilisé sur chaque candidature qui le demande, quelle que soit la formulation. Je soigne la tournure ; les faits restent les vôtres.',
  askedAs: (q: string) => `Demandé comme : « ${q} »`,
  fromThisJob: 'de cette offre',
  yourAnswerPlaceholder: 'Votre réponse…',
  emptyState: 'Remplissez une candidature — chaque question sans réponse atterrit ici, une seule fois.',
  timesUsed: (n: number) => `${n}×`,
}
