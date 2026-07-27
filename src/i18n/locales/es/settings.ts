// The Settings tab: AI setup, language, where we look for forms, backup, reset.

export const settings = {
  title: "Ajustes",
  hint: "Todo se queda en este ordenador: no hay cuenta ni ningún servidor nuestro. Rellenar formularios no necesita configuración; añade tu propia clave de IA para la importación de CV, la personalización y las puntuaciones.",

  languageTitle: "Idioma",
  languageAuto: "Automático (idioma del navegador)",

  aiTitle: "IA",
  aiNotSet: "sin configurar",
  aiUntested: "sin probar",

  backupTitle: "Copia de seguridad",
  backupSummary: "exportar / importar todo",
  backupHint: "Todo vive en este ordenador, así que nada se restaura solo si cambias de navegador o borras tus datos. Exporta una copia de vez en cuando: es la única copia que hay.",
  exportJson: "Exportar JSON",
  importJson: "Importar JSON",
  imported: "Importado.",
  importFailed: (msg: string) => `Error al importar: ${msg}`,

  detectOn: "activado — todos los sitios",
  detectOff: "desactivado — solo portales de empleo conocidos",
  detectHint: "Shortlisted vigila formularios de solicitud en todos los sitios y aparece cuando reconoce uno. Las páginas se revisan en tu ordenador y no se envía nada a ninguna parte. Desactívalo para limitarlo a los portales de empleo que admitimos directamente.",
  detectToggle: "Reconocer formularios de solicitud en cualquier sitio",
  whereILook: "Dónde busco formularios",

  resetTitle: "Borrarlo todo",
  resetSummary: "perfil, CV, candidaturas, respuestas",
  resetHint: "Elimina de este ordenador tu perfil, CV, candidaturas, ofertas guardadas y banco de respuestas. Se conservan tus ajustes de IA y el idioma. No se puede deshacer: exporta una copia antes.",
  resetConfirm: "Borrarlo todo",
  resetDone: "Borrado.",
}
