import type { tLocale } from '../en'

export const onboarding: tLocale['onboarding'] = {
  // No-CV guided builder
  buildTitle: 'Vamos criar o teu perfil juntos.',
  buildLead: 'Diz-me em que ponto estás e faço-te as perguntas certas.',
  buildStartingTitle: 'Estou a começar',
  buildStartingSub: 'A estudar, ou à procura do primeiro emprego.',
  buildWorkingTitle: 'Já trabalhei',
  buildWorkingSub: 'Só que nunca precisei de um CV.',
  buildCv: 'Criar o meu CV',
  probeNext: 'Seguinte',
  probeTitle: 'Umas perguntas rápidas.',
  probeLead: 'Responde ao que puderes — ajudam a criar um CV mais forte. Salta as que não encaixam.',
  talkStartingTitle: 'Conta-me o que já fizeste.',
  talkStartingLead:
    'Um projeto, voluntariado, um clube, um trabalho em part-time — tudo conta. Escreve tudo aqui e eu dou-lhe forma.',
  talkStartingPlaceholder:
    'ex. Projeto final: criei uma app para encontrar salas de estudo livres no campus. Escrevi o backend e conduzi as nossas reuniões semanais.',
  talkWorkingTitle: 'O teu emprego mais recente.',
  talkWorkingLead:
    'Onde trabalhaste, o que fazias, do que te orgulhas — é só contares e eu transformo no teu CV.',
  talkWorkingPlaceholder:
    'ex. Liderei uma equipa de 6 pessoas na Kordo Logistics durante 3 anos. Reformulei a escala de fins de semana para não ficarmos com falta de pessoal e formei os novos.',
  back: 'Voltar',
  welcomeLoginLink: 'Já tens conta? Inicia sessão',
  loginTitle: 'Olá de novo.',
  loginLead: 'Escreve o teu email — enviamos-te um código de 6 dígitos.',

  welcomeTitle: 'Vamos pôr-te na shortlist.',
  welcomeLead:
    'Cria o teu perfil profissional uma vez. Shortlisted reutiliza os teus dados e respostas nas candidaturas. Tu revês tudo antes de enviar.',
  importCvTitle: 'Tenho um CV',
  importCvSub: 'Envia ou cola o teu CV — a IA transforma-o no teu perfil. ~1 minuto.',
  startBlankTitle: 'Não tenho CV',
  startBlankSub: 'Sem problema — lá dentro ajudamos-te a criar o teu perfil e um CV cuidado.',

  pasteTitle: 'O teu CV, por favor.',
  pasteLead: 'Envia o PDF ou cola o texto.',
  uploadPdf: 'Carregar PDF',
  uploadSubIdle: 'A IA lê-o e cria o teu perfil.',
  readingCv: 'A ler o teu CV…',
  readingCloudSub: 'A extrair o teu perfil — demora um momento.',
  buildingTitle: 'A preparar o teu perfil…',
  buildingLead: 'Quase pronto — só uns segundos.',
  pastePlaceholder: '…ou cola aqui o texto do teu currículo.',
  buildProfile: 'Criar o meu perfil',
  reviewTitle: 'Acertei?',
  reviewLead: (roles: number, skills: number) =>
    `Encontrei ${roles} ${roles === 1 ? 'função' : 'funções'} e ${skills} competências. Corrige o que estiver errado — o resto podes editar depois.`,
  looksRight: 'Está certo',

  answersTitle: 'Uns dados rápidos.',
  jobTypeLabel: 'O que procuras?',
  jobTypePlaceholder: 'Tempo inteiro, estágio, contrato…',
  answersLead: 'Responde uma vez aqui, nunca mais numa candidatura.',
  salaryLabel: 'Expectativa salarial',
  salaryPlaceholder: '"4.000 €/mês" ou "A discutir"',
  noticeLabel: 'Quando podes começar?',
  noticePlaceholder: '"Imediatamente" ou "2 semanas de pré-aviso"',
  sponsorshipLabel: 'Precisas de patrocínio de visto?',
  sponsorshipPlaceholder: '"Não — freelancer remoto"',
  continue: 'Continuar',

  verifyTitle: 'Cria a tua conta.',
  verifyLead:
    'Um código e está feito — os teus dados na tua conta e os teus créditos de IA grátis desbloqueados.',
  emailPlaceholder: 'tu@exemplo.com',
  sendCode: 'Enviar código',
  sending: 'A enviar…',
  inboxTitle: 'Vê a tua caixa de entrada.',
  inboxLead: (email: string) =>
    `Enviámos um código de 6 dígitos para ${email}. Escreve-o abaixo para concluir.`,
  codeLabel: 'Código',
  codePlaceholder: '123456',
  verifyStart: 'Verificar e começar',
  checking: 'A verificar…',
  resendCode: 'Reenviar código',
  changeEmail: 'Mudar email',
}
