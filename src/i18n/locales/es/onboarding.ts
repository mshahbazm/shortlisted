import type { tLocale } from '../en'

export const onboarding: tLocale['onboarding'] = {
  back: '← Atrás',
  welcomeLoginLink: '¿Ya tienes una cuenta? Inicia sesión',
  loginTitle: 'Hola de nuevo.',
  loginLead: 'Escribe tu correo — te enviaremos un código de 6 dígitos.',

  welcomeTitle: 'Vamos a que te preseleccionen.',
  welcomeLead:
    'Cuéntame de ti una sola vez. Después cada solicitud de empleo se rellena sola — tú solo revisas y le das a enviar.',
  importCvTitle: 'Importar mi CV',
  importCvSub: 'Sube o pega tu CV — la IA lo convierte en tu perfil. ~1 minuto.',
  startBlankTitle: 'Empezar en blanco',
  startBlankSub: 'Escribe tus datos a mano en la pestaña Perfil.',

  pasteTitle: 'Tu CV, por favor.',
  pasteLead: 'Sube el PDF o pega el texto.',
  uploadPdf: 'Subir PDF',
  uploadAgain: 'Listo ✓ — elegir otro PDF',
  uploadSubIdle: 'La IA lo lee y crea tu perfil.',
  charsRead: (n: number) => `${n.toLocaleString()} caracteres leídos`,
  readingCv: 'Leyendo tu CV…',
  readingCloudSub: 'Extrayendo tu perfil — toma un momento.',
  pastePlaceholder: '…o pega aquí el texto de tu CV.',
  buildProfile: 'Crear mi perfil',
  reviewTitle: '¿Lo entendí bien?',
  reviewLead: (roles: number, skills: number) =>
    `Encontré ${roles} puesto${roles === 1 ? '' : 's'} y ${skills} habilidades. Corrige lo que no cuadre — el resto se puede editar después.`,
  looksRight: 'Se ve bien',

  answersTitle: 'Tres preguntas que hacen en todos lados.',
  answersLead: 'Respóndelas una vez aquí y nunca más en una solicitud.',
  salaryLabel: 'Expectativa salarial',
  salaryPlaceholder: '"$4,000/mes" o "Abierto a negociar"',
  noticeLabel: '¿Cuándo puedes empezar?',
  noticePlaceholder: '"De inmediato" o "2 semanas de preaviso"',
  sponsorshipLabel: '¿Necesitas patrocinio de visa?',
  sponsorshipPlaceholder: '"No — contratista remoto"',
  continue: 'Continuar',

  verifyTitle: 'Lo último — verifica tu correo.',
  verifyLead:
    'Un código y listo: tu perfil respaldado, tus créditos de IA gratis desbloqueados y tu página de perfil gratuita cuando la quieras.',
  emailPlaceholder: 'tu@ejemplo.com',
  sendCode: 'Enviar código',
  sending: 'Enviando…',
  inboxTitle: 'Revisa tu bandeja.',
  inboxLead: (email: string) =>
    `Enviamos un código de 6 dígitos a ${email}. Escríbelo aquí y listo — luego abre cualquier oferta y pulsa "Rellenar esta solicitud".`,
  codeLabel: 'Código',
  codePlaceholder: '123456',
  verifyStart: 'Verificar y empezar',
  checking: 'Comprobando…',
  resendCode: 'Reenviar código',
  changeEmail: 'Cambiar correo',
}
