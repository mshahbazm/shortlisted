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
  leadWithHeader: 'Mettez en avant',
  gapsHeader: 'Attendez-vous à des questions sur',
  languageNotice: (lang: string) => `Cette offre semble être en ${lang} — une langue absente de votre profil. Je peux quand même remplir le formulaire.`,
  aiWorking: (n: number) => `L’IA répond à ${n} question${n > 1 ? 's' : ''}…`,
  aiFilledNote: (n: number) => `L’IA en a rempli ${n} — vérifiez avant d’envoyer.`,
  aiFilled: 'Rempli par l’IA à partir de vos infos — vérifiez. Enregistrez pour mémoriser.',
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
  allDone: 'Tout ce qui est connu est rempli. Relisez la page, puis envoyez quand vous êtes prêt.',
  answerPlaceholder: 'Votre réponse… (enregistrée dans votre banque)',
  pickOne: 'Choisissez…',
  cvMissing: 'Cette offre demande un CV, mais aucun n’est enregistré. Ajoutez-le une fois — il sera joint à chaque candidature.',
  uploadCv: 'Téléverser un CV (PDF)',
  saveAndFill: 'Enregistrer et remplir',
  saved: 'Enregistré ✓',
}
