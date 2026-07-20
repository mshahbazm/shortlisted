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

  detectTitle: 'Deteção de vagas',
  detectOn: 'ligado — todos os sites',
  detectOff: 'desligado — apenas portais conhecidos',
  detectHint:
    'O Shortlisted procura formulários de candidatura em todos os sites e aparece quando reconhece um. As páginas são analisadas no seu computador e nada é enviado. Desligue para o limitar aos portais que suportamos diretamente.',
  detectToggle: 'Reconhecer formulários de candidatura em qualquer site',

  serverTitle: 'Servidor na nuvem',
  serverDevHint:
    'Esta é uma compilação de desenvolvimento não empacotada, por isso usa o seu servidor local. Altere apenas se o seu servidor estiver noutro sítio.',
  serverProdHint:
    'Ligado ao Shortlisted Cloud. Deixe vazio, a não ser que lhe tenham pedido para apontar para outro lado.',
  serverUrlLabel: 'URL do servidor',
  serverReset: 'Usar a predefinição',
  creditsLeft: 'Créditos restantes',
  creditsOf: 'de',
  goPro: 'Passar a Pro — 100 créditos por mês',
  proFoot: '9 $ por mês. Um CV adaptado ou uma pontuação custa 1 crédito. Preencher formulários é sempre grátis.',
  signedInLabel: 'Sessão iniciada',
  whereILook: 'Onde procuro formulários',
}
