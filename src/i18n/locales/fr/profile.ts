import type { tLocale } from '../en'

export const profile: tLocale['profile'] = {
  hint: 'Tout ce que l’extension remplit vient d’ici.',

  city: 'Ville',
  headline: 'Titre',
  summary: 'Résumé',
  skills: 'Compétences',
  industries: 'Secteurs',

  website: 'Site web',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  portfolio: 'Portfolio',

  company: 'Entreprise',
  workHighlights: 'Points forts — un par ligne, concrets et vrais',

  degree: 'Diplôme',
  fieldOfStudy: 'Domaine d’études',
  school: 'École',

  salaryHourly: 'Taux horaire',
  salaryMonthly: 'Salaire mensuel',
  noticeDays: 'Préavis (jours)',
  noticeDaysHint: '0 = disponible immédiatement',
  yearsOfExperience: 'Années d’expérience',
  timezone: 'Fuseau horaire',
  relocation: 'Mobilité',
  hoursOverlap: 'Chevauchement horaire',
  englishLevel: 'Niveau d’anglais',

  tellMeFinishJob: (company: string) =>
    `Ajoutez l’intitulé et les dates pour ${company} afin qu’un CV adapté ne montre pas de trou.`,
  workNeedsDetail:
    'Intitulé et date de début manquants — un CV adapté y verra un trou.',
  tellMeNoSuchJob:
    'Je n\'ai pas pu rattacher cela à un poste — ajoutez d\'abord le poste dans Expérience, puis parlez-m\'en.',
  uploadPdf: 'Importer le PDF',
  reading: 'Lecture…',
  answerBankTitle: 'Banque de réponses',
  reimportMergeReviewBody: (count: number) =>
    `${count === 1 ? '1 nouvel élément' : `${count} nouveaux éléments`} dans ce CV. Retirez ce que vous ne voulez pas, puis ajoutez le reste.`,
  sex: 'Sexe',
  drivingLicence: 'Permis de conduire',
  additionalInfo: 'Informations complémentaires',
  communicationSkills: 'Compétences en communication',
  organisationalSkills: 'Compétences organisationnelles',
  digitalSkills: 'Compétences numériques',
  jobType: 'Type de poste',
  oneCredit: '1 crédit',
  segUnanswered: 'Sans réponse',
  photo: "Photo",
  manageProfileOnWeb: 'Modifier votre profil sur le web →',
}
