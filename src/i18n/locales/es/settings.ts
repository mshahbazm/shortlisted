import type { tLocale } from '../en'

export const settings: tLocale['settings'] = {
  title: 'Ajustes',
  hint: 'Rellenar funciona sin configuración. Tu cuenta desbloquea la IA — importar el CV, adaptarlo y puntuar tu encaje.',

  languageTitle: 'Idioma',
  languageAuto: 'Automático (idioma del navegador)',

  accountIntro:
    'Inicia sesión con tu correo para desbloquear la IA y guardar tus datos en tu cuenta. Gratis: 10 créditos. Pro ($9/mes): 100 créditos al mes. Un CV adaptado ≈ 1 crédito.',
  emailPlaceholder: 'tu@ejemplo.com',
  sendCode: 'Envíame un código',
  sending: 'Enviando…',
  codeSent: 'Código enviado — revisa tu correo.',
  codeLabel: 'El código de 6 dígitos de tu correo',
  codePlaceholder: '123456',
  signIn: 'Iniciar sesión',
  checking: 'Comprobando…',
  resendCode: 'Reenviar código',
  signedIn: 'Sesión iniciada.',
  checkCredits: 'Ver mis créditos',
  planFree: 'Gratis',
  planPro: 'Pro',
  signOutDevice: 'Cerrar sesión en este dispositivo',

  backupTitle: 'Copia de seguridad',
  backupSummary: 'exporta / importa todo',
  exportJson: 'Exportar JSON',
  importJson: 'Importar JSON',
  imported: 'Importado.',
  importFailed: (msg: string) => `Error al importar: ${msg}`,

  detectOn: 'activado — todos los sitios',
  detectOff: 'desactivado — solo portales conocidos',
  detectHint:
    'Shortlisted busca formularios de solicitud en todos los sitios y aparece cuando reconoce uno. Las páginas se analizan en tu ordenador y no se envía nada a ninguna parte. Desactívalo para limitarlo a los portales que admitimos directamente.',
  detectToggle: 'Reconocer formularios de solicitud en cualquier sitio',

  serverTitle: 'Servidor en la nube',
  serverDevHint:
    'Esta es una compilación de desarrollo sin empaquetar, así que usa tu servidor local. Cámbialo solo si tu servidor está en otra dirección.',
  serverProdHint:
    'Conectado a Shortlisted Cloud. Déjalo vacío salvo que te hayan pedido apuntar a otro sitio.',
  serverUrlLabel: 'URL del servidor',
  serverReset: 'Usar el valor predeterminado',
  creditsLeft: 'Créditos restantes',
  creditsOf: 'de',
  goPro: 'Hazte Pro — 100 créditos al mes',
  proFoot: '9 $ al mes. Un CV adaptado o una puntuación cuesta 1 crédito. Rellenar formularios siempre es gratis.',
  whereILook: 'Dónde busco formularios',
}
