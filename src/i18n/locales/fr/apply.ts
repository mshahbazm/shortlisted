import type { tLocale } from '../en'

export const apply: tLocale['apply'] = {
  inQueue: 'en attente',
  applied: 'envoyées',
  openNextJob: 'Ouvrir l’offre suivante',
  fillCurrentTab: 'Remplir l’onglet actuel',
  addedJobs: (n: number) => `${n} offre${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''}.`,
  permissionDeclined:
    'Permission refusée — le remplissage auto marche toujours sur les sites d’emploi connus.',
  lookForPanel: 'Cherchez le panneau Shortlisted sur la page.',
  fitChip: (score: number) => `match ${score}/10`,
  andMore: (n: number) => `…et ${n} de plus`,
  emptyQueue: 'Aucune offre en attente. Ajoutez-en ci-dessous ↓',

  addJobsTitle: 'Ajouter des offres',
  addJobsSummary: 'collez des liens, un par ligne',
  jobLinksLabel: 'Liens d’offres — un par ligne',
  addToQueue: 'Ajouter à la file',
  checkFitTitle: 'Vérifier mon match',
  checkFitSummary: 'collez une offre, obtenez un score honnête',
  scoreMyFit: 'Noter mon match',
  scoring: 'Notation…',
  leadWith: (strengths: string) => `Mettez en avant : ${strengths}`,
  gapsHint: (gaps: string) => `Points faibles (préparez-vous à ces questions) : ${gaps}`,
  notShown: 'non affiché',

  appliedTitle: 'Envoyées',
  appliedSummary: (n: number) => (n ? `${n} pour l’instant` : 'rien pour le moment'),
  submitsLogged: 'Les envois sont enregistrés ici automatiquement.',
  pageLink: 'page',
  statusApplied: 'envoyée',
  statusInterviewing: 'entretien',
  statusOffer: 'proposition',
  statusRejected: 'refusée',
}
