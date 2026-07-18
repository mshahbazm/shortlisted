import type { tLocale } from '../en'

export const settings: tLocale['settings'] = {
  title: 'Definições',
  hint: 'Preencher funciona sem configuração. A tua conta desbloqueia a IA — importar o CV, adaptá-lo e pontuar o teu fit.',

  languageTitle: 'Idioma',
  languageAuto: 'Automático (idioma do navegador)',

  accountTitle: 'Conta',
  notSignedIn: 'sem sessão iniciada',
  accountIntro:
    'Inicia sessão com o teu e-mail para desbloquear a IA e guardar os teus dados na tua conta. Grátis: 10 créditos. Pro ($9/mês): 100 créditos por mês. Um CV adaptado ≈ 1 crédito.',
  emailPlaceholder: 'tu@exemplo.com',
  sendCode: 'Envia-me um código',
  sending: 'A enviar…',
  codeSent: 'Código enviado — verifica o teu e-mail.',
  codeLabel: 'O código de 6 dígitos do teu e-mail',
  codePlaceholder: '123456',
  signIn: 'Iniciar sessão',
  checking: 'A verificar…',
  resendCode: 'Reenviar código',
  signedIn: 'Sessão iniciada.',
  signedInAs: (email: string) => `Sessão iniciada como ${email}`,
  checkCredits: 'Ver os meus créditos',
  usageLine: (plan: string, used: number, limit: number, monthly: boolean) =>
    `${plan} · ${used} de ${limit} créditos usados${monthly ? ' este mês' : ' (no total)'}`,
  planFree: 'Grátis',
  planPro: 'Pro',
  signOutDevice: 'Terminar sessão neste dispositivo',

  backupTitle: 'Backup',
  backupSummary: 'exportar / importar tudo',
  exportJson: 'Exportar JSON',
  importJson: 'Importar JSON',
  imported: 'Importado.',
  importFailed: (msg: string) => `Falha na importação: ${msg}`,

  cloudServerTitle: 'Servidor cloud',
  cloudServerDefault: (url: string) => `${url} (padrão)`,
  cloudServerLabel: (url: string) => `URL personalizado — deixa vazio para o padrão (${url})`,

  rulesTitle: 'As regras',
  rulesSummary: 'sem envio automático, sem mentiras',
  rulesBody:
    'És tu que clicas em enviar — sempre. Os CAPTCHA são contigo. A adaptação do CV apenas reorganiza o que é verdade — não pode inventar competências nem experiência.',
}
