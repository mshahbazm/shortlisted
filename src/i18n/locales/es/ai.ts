// The AI setup screen — shown once in the first-run wizard, and living in
// Settings after that. One namespace because it is one surface in two places.
//
// Deliberately terse. It is a form on a 400px panel, and every explanatory
// sentence pushes the Save button further off screen.

export const ai = {
  title: "Conecta tu IA.",
  lead: "Funciona con tu propia clave. A nosotros no llega nada.",
  settingsTitle: "IA",

  endpointLabel: "Dirección de la API",
  endpointPlaceholder: "https://api.openai.com/v1",
  endpointHint: "Cualquier API compatible con OpenAI.",
  keyLabel: "Clave de API",
  keyPlaceholder: "sk-…",
  keyHintLocal: "No hace falta para un modelo en este ordenador.",
  keyHint: "Se guarda solo en este ordenador.",
  modelLabel: "Modelo",
  modelPlaceholder: "gpt-5.2",

  test: "Probar",
  testing: "Probando…",
  testAgain: "Probar otra vez",
  save: "Guardar",
  continue: "Continuar",
  skipForNow: "Configurar más tarde",

  resultOk: "Funciona: este modelo puede hacer todo lo que Shortlisted necesita.",
  resultNoVision: "Funciona. No lee PDF escaneados, así que sube CV con texto seleccionable.",
  resultBadJson: "Respondió, pero no en el formato necesario. Prueba con uno más grande.",
  resultFailed: "No se pudo conectar con esa dirección.",

  privacyNote: "Tu clave y todo lo que escribas se quedan en este ordenador. Pagas a tu proveedor directamente.",
}
