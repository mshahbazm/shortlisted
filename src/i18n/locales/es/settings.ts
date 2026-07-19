import type { tLocale } from '../en'

export const settings: tLocale['settings'] = {
  title: 'Ajustes',
  hint: 'Rellenar funciona sin configuración. Tu cuenta desbloquea la IA — importar el CV, adaptarlo y puntuar tu encaje.',

  languageTitle: 'Idioma',
  languageAuto: 'Automático (idioma del navegador)',

  accountTitle: 'Cuenta',
  notSignedIn: 'sin iniciar sesión',
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
  signedInAs: (email: string) => `Sesión iniciada como ${email}`,
  checkCredits: 'Ver mis créditos',
  usageLine: (plan: string, used: number, limit: number, monthly: boolean) =>
    `${plan} · ${used} de ${limit} créditos usados${monthly ? ' este mes' : ' (en total)'}`,
  planFree: 'Gratis',
  planPro: 'Pro',
  signOutDevice: 'Cerrar sesión en este dispositivo',

  backupTitle: 'Copia de seguridad',
  backupSummary: 'exporta / importa todo',
  exportJson: 'Exportar JSON',
  importJson: 'Importar JSON',
  imported: 'Importado.',
  importFailed: (msg: string) => `Error al importar: ${msg}`,

  detectTitle: 'Detección de ofertas',
  detectOn: 'todos los sitios',
  detectOff: 'solo portales conocidos',
  detectHint:
    'Por defecto el panel solo aparece en los portales de empleo que conocemos. Si activas esto, Shortlisted también busca formularios de solicitud en otros sitios y aparece cuando está seguro. Las páginas se analizan en tu ordenador: no se envía nada a ninguna parte.',
  detectToggle: 'Buscar formularios de solicitud en todos los sitios',
  detectDeclined: 'No se activó: Chrome necesita acceso a todos los sitios.',
}
