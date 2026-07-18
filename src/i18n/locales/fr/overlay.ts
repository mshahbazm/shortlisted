import type { tLocale } from '../en'

export const overlay: tLocale['overlay'] = {
  fillApplication: 'Remplir cette candidature',
  fillAgain: 'Remplir à nouveau',
  idleNote:
    'Remplit ce qu’il sait, demande le reste. Vous relisez tout et cliquez sur envoyer vous-même.',
  filling: 'Remplissage…',
  howDoIScore: 'Quel est mon score pour cette offre ?',
  scoringFit: 'Calcul de votre match…',
  scoringFailed: 'Échec du calcul.',
  scoringFailedRetry: 'Échec du calcul — réessayez.',
  fitDenominator: '/10 de match',
  leadWith: (strengths: string) => `Mettez en avant : ${strengths}`,
  gaps: (gaps: string) => `Points faibles : ${gaps}`,
  filledFields: (n: number) => `${n} champ${n > 1 ? 's' : ''} rempli${n > 1 ? 's' : ''}.`,
  cvAttached: (label: string) => `CV joint : ${label}`,
  attachWhichCv: 'Quel CV joindre ?',
  swap: 'Changer',
  attach: 'Joindre',
  fromBankHeader: 'Rempli depuis votre banque de réponses — vérifiez bien ceci :',
  usedSimilarAnswer:
    'Réponse similaire réutilisée. Modifiez sur la page si elle ne colle pas.',
  newQuestionsHeader: 'Nouvelles questions — répondez une fois, réutilisées pour toujours :',
  skippedDemographic: (n: number) =>
    `${n} question(s) démographiques/de sondage laissée(s) de côté — à vous d’y répondre à la main.`,
  allDone: 'Tout ce qu’il sait est rempli. Relisez la page, puis envoyez quand vous êtes prêt.',
  answerPlaceholder: 'Votre réponse… (enregistrée dans votre banque)',
  saveAndFill: 'Enregistrer et remplir',
  saved: 'Enregistré ✓',
}
