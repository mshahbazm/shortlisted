import type { tLocale } from '../en'

export const onboarding: tLocale['onboarding'] = {
  back: '← Voltar',
  welcomeLoginLink: 'Já tens conta? Inicia sessão',
  loginTitle: 'Olá de novo.',
  loginLead: 'Escreve o teu email — enviamos-te um código de 6 dígitos.',

  welcomeTitle: 'Vamos pôr-te na shortlist.',
  welcomeLead:
    'Fala-me de ti uma vez. Depois cada candidatura preenche-se sozinha — tu só revês e clicas em enviar.',
  importCvTitle: 'Tenho um CV',
  importCvSub: 'Envia ou cola o teu CV — a IA transforma-o no teu perfil. ~1 minuto.',
  startBlankTitle: 'Não tenho CV',
  startBlankSub: 'Responde a umas perguntas rápidas — criamos o teu perfil e um CV por ti.',

  pasteTitle: 'O teu CV, por favor.',
  pasteLead: 'Envia o PDF ou cola o texto.',
  uploadPdf: 'Carregar PDF',
  uploadAgain: 'Recebido ✓ — escolher outro PDF',
  uploadSubIdle: 'A IA lê-o e cria o teu perfil.',
  charsRead: (n: number) => `${n.toLocaleString()} caracteres lidos`,
  readingCv: 'A ler o teu CV…',
  readingCloudSub: 'A extrair o teu perfil — demora um momento.',
  pastePlaceholder: '…ou cola aqui o texto do teu currículo.',
  buildProfile: 'Criar o meu perfil',
  reviewTitle: 'Acertei?',
  reviewLead: (roles: number, skills: number) =>
    `Encontrei ${roles} ${roles === 1 ? 'função' : 'funções'} e ${skills} competências. Corrige o que estiver errado — o resto podes editar depois.`,
  looksRight: 'Está certo',

  answersTitle: 'Três perguntas que todas as vagas fazem.',
  answersLead: 'Responde uma vez aqui, nunca mais numa candidatura.',
  salaryLabel: 'Expectativa salarial',
  salaryPlaceholder: '"4.000 €/mês" ou "A discutir"',
  noticeLabel: 'Quando podes começar?',
  noticePlaceholder: '"Imediatamente" ou "2 semanas de pré-aviso"',
  sponsorshipLabel: 'Precisas de patrocínio de visto?',
  sponsorshipPlaceholder: '"Não — freelancer remoto"',
  continue: 'Continuar',

  verifyTitle: 'Última coisa — verifica o teu email.',
  verifyLead:
    'Um código e está feito: o teu perfil com backup, os teus créditos de IA grátis desbloqueados, e a tua página de perfil gratuita quando a quiseres.',
  emailPlaceholder: 'tu@exemplo.com',
  sendCode: 'Enviar código',
  sending: 'A enviar…',
  inboxTitle: 'Vê a tua caixa de entrada.',
  inboxLead: (email: string) =>
    `Enviámos um código de 6 dígitos para ${email}. Escreve-o aqui e está feito — depois abre qualquer vaga e clica em "Preencher esta candidatura".`,
  codeLabel: 'Código',
  codePlaceholder: '123456',
  verifyStart: 'Verificar e começar',
  checking: 'A verificar…',
  resendCode: 'Reenviar código',
  changeEmail: 'Mudar email',
}
