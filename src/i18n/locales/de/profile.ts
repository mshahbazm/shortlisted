import type { tLocale } from '../en'

export const profile: tLocale['profile'] = {
  hint: 'Alles, was die Extension ausfüllt, kommt von hier.',

  city: 'Stadt',
  headline: 'Headline',
  summary: 'Kurzprofil',
  skills: 'Skills',
  industries: 'Branchen',

  website: 'Website',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  portfolio: 'Portfolio',

  company: 'Firma',
  workHighlights: 'Highlights — eins pro Zeile, echt und konkret',

  degree: 'Abschluss',
  fieldOfStudy: 'Fachrichtung',
  school: 'Schule / Hochschule',

  salaryHourly: 'Stundensatz',
  salaryMonthly: 'Monatsgehalt',
  noticeDays: 'Kündigungsfrist (Tage)',
  noticeDaysHint: '0 = sofort verfügbar',
  yearsOfExperience: 'Jahre Berufserfahrung',
  timezone: 'Zeitzone',
  relocation: 'Umzug',
  hoursOverlap: 'Zeitliche Überschneidung',
  englishLevel: 'Englisch-Niveau',

  tellMeFinishJob: (company: string) =>
    `Ergänzen Sie Position und Zeitraum für ${company}, damit ein zugeschnittener Lebenslauf keine Lücke zeigt.`,
  workNeedsDetail:
    'Position und Startdatum fehlen — ein zugeschnittener Lebenslauf liest das als Lücke.',
  tellMeNoSuchJob:
    'Das ließ sich keiner Station zuordnen — legen Sie die Station zuerst unter Berufserfahrung an und erzählen Sie es mir dann.',
  uploadPdf: 'PDF hochladen',
  reading: 'Lese…',
  answerBankTitle: 'Antwortsammlung',
  reimportMergeReviewBody: (count: number) =>
    `${count === 1 ? '1 neues Element' : `${count} neue Elemente`} in diesem Lebenslauf gefunden. Entferne, was du nicht möchtest, und füge den Rest hinzu.`,
  sex: 'Geschlecht',
  drivingLicence: 'Führerschein',
  additionalInfo: 'Zusätzliche Informationen',
  communicationSkills: 'Kommunikationsfähigkeiten',
  organisationalSkills: 'Organisationstalent',
  digitalSkills: 'Digitale Kompetenzen',
  jobType: 'Beschäftigungsart',
  oneCredit: '1 Credit',
  segUnanswered: 'Offen',
  photo: "Foto",
  manageProfileOnWeb: 'Profil im Web bearbeiten →',
}
