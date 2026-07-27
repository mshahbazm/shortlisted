// The Settings tab: AI setup, language, where we look for forms, backup, reset.

export const settings = {
  title: "Definições",
  hint: "Preencher formulários funciona sem configurar nada. A tua própria chave de IA liga a importação de CV, a personalização e as pontuações de vagas.",

  languageTitle: "Idioma",
  languageAuto: "Automático (idioma do navegador)",

  aiTitle: "IA",
  aiNotSet: "por configurar",
  aiUntested: "por testar",

  backupTitle: "Cópia de segurança",
  backupSummary: "exportar / importar tudo",
  backupHint: "Está tudo neste computador, por isso nada se restaura sozinho se mudares de navegador ou apagares os teus dados. Exporta uma cópia de vez em quando — é a única cópia que existe.",
  exportJson: "Exportar JSON",
  importJson: "Importar JSON",
  imported: "Importado.",
  importFailed: (msg: string) => `Falha na importação: ${msg}`,

  detectOn: "ligado — todos os sites",
  detectOff: "desligado — só portais de emprego conhecidos",
  detectHint: "O Shortlisted procura formulários de candidatura em todos os sites e aparece quando reconhece um. As páginas são analisadas no teu computador e nada sai daí. Desliga para te limitares aos portais de emprego que suportamos diretamente.",
  detectToggle: "Reconhecer formulários de candidatura em qualquer site",
  whereILook: "Onde procuro formulários",

  resetTitle: "Apagar tudo",
  resetSummary: "perfil, CV, candidaturas, respostas",
  resetHint: "Apaga deste computador o teu perfil, CV, candidaturas, vagas guardadas e banco de respostas. As definições de IA e o idioma ficam. Não dá para desfazer — exporta primeiro uma cópia.",
  resetConfirm: "Apagar tudo",
  resetDone: "Apagado.",
}
