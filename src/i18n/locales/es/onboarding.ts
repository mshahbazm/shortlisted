import type { tLocale } from '../en'

export const onboarding: tLocale['onboarding'] = {
  back: 'Atrás',
  welcomeLoginLink: '¿Ya tienes una cuenta? Inicia sesión',
  loginTitle: 'Hola de nuevo.',
  loginLead: 'Escribe tu correo — te enviaremos un código de 6 dígitos.',

  welcomeTitle: 'Vamos a que te preseleccionen.',
  welcomeLead:
    'Crea tu perfil profesional una sola vez. Shortlisted reutiliza tus datos y respuestas en tus solicitudes de empleo. Tú lo revisas todo antes de enviar.',
  importCvTitle: 'Tengo un CV',
  importCvSub: 'Sube o pega tu CV — la IA lo convierte en tu perfil. ~1 minuto.',
  startBlankTitle: 'No tengo CV',
  startBlankSub: 'No pasa nada — dentro te ayudamos a crear tu perfil y un CV impecable.',

  pasteTitle: 'Tu CV, por favor.',
  pasteLead: 'Sube el PDF o pega el texto.',
  uploadPdf: 'Subir PDF',
  uploadSubIdle: 'La IA lo lee y crea tu perfil.',
  readingCv: 'Leyendo tu CV…',
  readingCloudSub: 'Extrayendo tu perfil — toma un momento.',
  buildingTitle: 'Preparando tu perfil…',
  buildingLead: 'Casi listo — unos segundos.',
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

  verifyTitle: 'Crea tu cuenta.',
  verifyLead:
    'Un código y listo — tus datos guardados en tu cuenta y tus créditos de IA gratis desbloqueados.',
  emailPlaceholder: 'tu@ejemplo.com',
  sendCode: 'Enviar código',
  sending: 'Enviando…',
  inboxTitle: 'Revisa tu bandeja.',
  inboxLead: (email: string) =>
    `Enviamos un código de 6 dígitos a ${email}. Escríbelo abajo para terminar.`,
  codeLabel: 'Código',
  codePlaceholder: '123456',
  verifyStart: 'Verificar y empezar',
  checking: 'Comprobando…',
  resendCode: 'Reenviar código',
  changeEmail: 'Cambiar correo',
}
