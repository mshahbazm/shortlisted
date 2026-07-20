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
  noPending: 'Rien en attente. Les questions d’un formulaire auxquelles je ne sais pas répondre arrivent ici.',
  pendingLede: 'Répondez une fois. Je réutilise la réponse sur tout formulaire qui pose la même question.',
}
