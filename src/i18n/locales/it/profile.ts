import type { tLocale } from '../en'

export const profile: tLocale['profile'] = {
  hint: "Tutto ciò che l'estensione compila parte da qui.",

  city: 'Città',
  headline: 'Titolo professionale',
  summary: 'Presentazione',
  skills: 'Competenze',
  industries: 'Settori',

  website: 'Sito web',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  portfolio: 'Portfolio',

  company: 'Azienda',
  workHighlights: 'Risultati — uno per riga, veri e concreti',

  degree: 'Titolo di studio',
  fieldOfStudy: 'Campo di studi',
  school: 'Istituto',

  salaryHourly: 'Tariffa oraria',
  salaryMonthly: 'Stipendio mensile',
  noticeDays: 'Preavviso (giorni)',
  noticeDaysHint: '0 = disponibile subito',
  yearsOfExperience: 'Anni di esperienza',
  timezone: 'Fuso orario',
  relocation: 'Trasferimento',
  hoursOverlap: 'Ore in comune',
  englishLevel: 'Livello di inglese',

  tellMeFinishJob: (company: string) =>
    `Aggiungi ruolo e date per ${company} così un CV su misura non mostra un vuoto.`,
  workNeedsDetail:
    'Mancano ruolo e data di inizio: un CV su misura lo legge come un vuoto.',
  tellMeNoSuchJob:
    'Non sono riuscito a collegarlo a un lavoro: aggiungi prima il lavoro in Esperienza, poi raccontamelo.',
  uploadPdf: 'Carica PDF',
  reading: 'Lettura…',
  answerBankTitle: 'Archivio risposte',
  reimportMergeReviewBody: (count: number) =>
    `${count === 1 ? '1 nuovo elemento' : `${count} nuovi elementi`} in questo CV. Rimuovi ciò che non vuoi e aggiungi il resto.`,
  sex: 'Sesso',
  drivingLicence: 'Patente',
  additionalInfo: 'Informazioni aggiuntive',
  communicationSkills: 'Competenze comunicative',
  organisationalSkills: 'Competenze organizzative',
  digitalSkills: 'Competenze digitali',
  jobType: 'Tipo di lavoro',
  oneCredit: '1 credito',
  segUnanswered: 'Senza risposta',
  photo: "Foto",
  manageProfileOnWeb: 'Modifica il profilo sul web →',
}
