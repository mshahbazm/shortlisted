import type { tLocale } from '../en'

export const profile: tLocale['profile'] = {
  hint: 'Todo lo que la extensión rellena sale de aquí.',

  city: 'Ciudad',
  headline: 'Titular',
  summary: 'Resumen',
  skills: 'Habilidades',
  industries: 'Sectores',

  website: 'Sitio web',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  portfolio: 'Portafolio',

  company: 'Empresa',
  workHighlights: 'Logros — uno por línea, reales y concretos',

  degree: 'Título',
  fieldOfStudy: 'Área de estudio',
  school: 'Institución',

  salaryHourly: 'Tarifa por hora',
  salaryMonthly: 'Salario mensual',
  noticeDays: 'Preaviso (días)',
  noticeDaysHint: '0 = disponible de inmediato',
  yearsOfExperience: 'Años de experiencia',
  timezone: 'Zona horaria',
  relocation: 'Reubicación',
  hoursOverlap: 'Horas de coincidencia',
  englishLevel: 'Nivel de inglés',

  tellMeFinishJob: (company: string) =>
    `Añade el puesto y las fechas de ${company} para que un CV adaptado no muestre un hueco.`,
  workNeedsDetail:
    'Faltan el puesto y la fecha de inicio: un CV adaptado lo interpreta como un vacío.',
  tellMeNoSuchJob:
    'No pude vincular eso a un empleo: añade primero el empleo en Experiencia y luego cuéntamelo.',
  uploadPdf: 'Subir PDF',
  reading: 'Leyendo…',
  answerBankTitle: 'Banco de respuestas',
  reimportMergeReviewBody: (count: number) =>
    `${count === 1 ? '1 elemento nuevo' : `${count} elementos nuevos`} en este CV. Quita lo que no quieras y añade el resto.`,
  sex: 'Sexo',
  drivingLicence: 'Carné de conducir',
  additionalInfo: 'Información adicional',
  communicationSkills: 'Habilidades de comunicación',
  organisationalSkills: 'Habilidades organizativas',
  digitalSkills: 'Competencias digitales',
  jobType: 'Tipo de empleo',
  oneCredit: '1 crédito',
  segUnanswered: 'Sin responder',
  photo: "Foto",
  manageProfileOnWeb: 'Edita tu perfil en la web →',
}
