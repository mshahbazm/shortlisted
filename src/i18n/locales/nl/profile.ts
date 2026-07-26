import type { tLocale } from '../en'

export const profile: tLocale['profile'] = {
  hint: 'Alles wat de extensie invult, komt hiervandaan.',

  city: 'Stad',
  headline: 'Functietitel',
  summary: 'Samenvatting',
  skills: 'Vaardigheden',
  industries: 'Branches',

  website: 'Website',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  portfolio: 'Portfolio',

  company: 'Bedrijf',
  workHighlights: 'Hoogtepunten — één per regel, echt en concreet',

  degree: 'Diploma',
  fieldOfStudy: 'Studierichting',
  school: 'School',

  salaryHourly: 'Uurtarief',
  salaryMonthly: 'Maandsalaris',
  noticeDays: 'Opzegtermijn (dagen)',
  noticeDaysHint: '0 = per direct beschikbaar',
  yearsOfExperience: 'Jaren ervaring',
  timezone: 'Tijdzone',
  relocation: 'Verhuizen',
  hoursOverlap: 'Overlappende uren',
  englishLevel: 'Niveau Engels',

  tellMeFinishJob: (company: string) =>
    `Vul functie en periode in voor ${company}, zodat een cv op maat geen gat laat zien.`,
  workNeedsDetail:
    'Functietitel en startdatum ontbreken — een cv op maat leest dit als een gat.',
  tellMeNoSuchJob:
    'Ik kon dat niet aan een baan koppelen — voeg de baan eerst toe onder Werk en vertel het me daarna.',
  uploadPdf: 'PDF uploaden',
  reading: 'Lezen…',
  answerBankTitle: 'Antwoordenbank',
  reimportMergeReviewBody: (count: number) =>
    `${count === 1 ? '1 nieuw item' : `${count} nieuwe items`} in dit cv gevonden. Verwijder wat je niet wilt en voeg de rest toe.`,
  sex: 'Geslacht',
  drivingLicence: 'Rijbewijs',
  additionalInfo: 'Aanvullende informatie',
  communicationSkills: 'Communicatievaardigheden',
  organisationalSkills: 'Organisatorische vaardigheden',
  digitalSkills: 'Digitale vaardigheden',
  jobType: 'Functietype',
  oneCredit: '1 credit',
  segUnanswered: 'Open',
  photo: "Foto",
  manageProfileOnWeb: 'Bewerk je profiel op het web →',
}
