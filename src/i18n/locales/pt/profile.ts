import type { tLocale } from '../en'

export const profile: tLocale['profile'] = {
  hint: 'Tudo o que a extensão preenche vem daqui.',

  city: 'Cidade',
  headline: 'Título profissional',
  summary: 'Resumo',
  skills: 'Competências',
  industries: 'Setores',

  website: 'Website',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  portfolio: 'Portefólio',

  company: 'Empresa',
  workHighlights: 'Destaques — um por linha, reais e concretos',

  degree: 'Grau',
  fieldOfStudy: 'Área de estudo',
  school: 'Instituição',

  salaryHourly: 'Valor por hora',
  salaryMonthly: 'Salário mensal',
  noticeDays: 'Pré-aviso (dias)',
  noticeDaysHint: '0 = disponível de imediato',
  yearsOfExperience: 'Anos de experiência',
  timezone: 'Fuso horário',
  relocation: 'Relocalização',
  hoursOverlap: 'Sobreposição de horário',
  englishLevel: 'Nível de inglês',

  tellMeFinishJob: (company: string) =>
    `Adicione o cargo e as datas de ${company} para que um CV adaptado não mostre uma lacuna.`,
  workNeedsDetail:
    'Faltam cargo e data de início — um CV adaptado lê isto como uma lacuna.',
  tellMeNoSuchJob:
    'Não consegui associar isso a um emprego — adicione primeiro o emprego em Experiência e depois conte-me.',
  uploadPdf: 'Enviar PDF',
  reading: 'A ler…',
  answerBankTitle: 'Banco de respostas',
  reimportMergeReviewBody: (count: number) =>
    `${count === 1 ? '1 novo item' : `${count} novos itens`} neste CV. Remove o que não quiseres e adiciona o resto.`,
  sex: 'Sexo',
  drivingLicence: 'Carta de condução',
  additionalInfo: 'Informação adicional',
  communicationSkills: 'Competências de comunicação',
  organisationalSkills: 'Competências organizacionais',
  digitalSkills: 'Competências digitais',
  jobType: 'Tipo de emprego',
  oneCredit: '1 crédito',
  segUnanswered: 'Por responder',
  photo: "Foto",
  manageProfileOnWeb: 'Editar o seu perfil na web →',
}
