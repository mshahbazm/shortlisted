import type { tLocale } from '../en'

export const settings: tLocale['settings'] = {
  title: 'Definições',
  hint: 'Preencher funciona sem configuração. A tua conta desbloqueia a IA — importar o CV, adaptá-lo e pontuar o teu fit.',

  languageTitle: 'Idioma',
  languageAuto: 'Automático (idioma do navegador)',

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
  checkCredits: 'Ver os meus créditos',
  planFree: 'Grátis',
  planPro: 'Pro',
  signOutDevice: 'Terminar sessão neste dispositivo',

  backupTitle: 'Backup',
  backupSummary: 'exportar / importar tudo',
  exportJson: 'Exportar JSON',
  importJson: 'Importar JSON',
  imported: 'Importado.',
  importFailed: (msg: string) => `Falha na importação: ${msg}`,

  detectOn: 'ligado — todos os sites',
  detectOff: 'desligado — apenas portais conhecidos',
  detectHint:
    'O Shortlisted procura formulários de candidatura em todos os sites e aparece quando reconhece um. As páginas são analisadas no seu computador e nada é enviado. Desligue para o limitar aos portais que suportamos diretamente.',
  detectToggle: 'Reconhecer formulários de candidatura em qualquer site',

  creditsLeft: 'Créditos restantes',
  creditsOf: 'de',
  goPro: 'Passar a Pro — 100 créditos por mês',
  proMonthly: 'Pro mensal — 15 $/mês',
  proAnnual: 'Pro anual — 150 $/ano',
  proFoot: '15 $/mês ou 150 $/ano. 100 créditos por mês; preencher formulários é sempre grátis.',
  manageSub: 'Gerir subscrição',
  historyTitle: 'Histórico de créditos',
  historySummary: 'concessões, gastos, reinícios mensais',
  historyHint: 'Cada crédito concedido, gasto e reiniciado — o teu histórico completo.',
  historyEmpty: 'Ainda sem atividade de créditos.',
  whereILook: 'Onde procuro formulários',
}
