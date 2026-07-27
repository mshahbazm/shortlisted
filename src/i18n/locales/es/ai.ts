// The AI setup screen — shown once in the first-run wizard, and living in
// Settings after that. One namespace because it is one surface in two places.

export const ai = {
  title: "Conecta tu IA.",
  lead: "Shortlisted funciona con tu propia clave de IA. A nosotros no llega nada: tu CV y tus respuestas van directas de este navegador al servicio que elijas abajo.",
  settingsTitle: "IA",

  providerLabel: "¿A dónde enviamos las peticiones de IA?",
  endpointLabel: "Dirección de la API",
  endpointPlaceholder: "https://api.openai.com/v1",
  endpointHint: "Cualquier API compatible con OpenAI. Elige una arriba o escribe la tuya.",
  keyLabel: "Clave de API",
  keyPlaceholder: "sk-…",
  keyHintLocal: "No hace falta para algo que corre en tu propio ordenador.",
  keyHint: "Se guarda solo en este ordenador y solo se envía a la dirección de arriba.",
  modelLabel: "Modelo",
  modelPlaceholder: "gpt-5.2",
  modelHint: "El modelo que escribe: CV a medida, biografías, respuestas.",
  miniModelLabel: "Modelo más barato (opcional)",
  miniModelPlaceholder: "déjalo vacío para usar el mismo",
  miniModelHint: "Para el trabajo pesado: leer CV, puntuar ofertas. Un modelo más pequeño aquí abarata mucho.",
  onThisMachine: "En este ordenador",

  test: "Probar",
  testing: "Probando…",
  testAgain: "Probar otra vez",
  save: "Guardar",
  saved: "Guardado",
  continue: "Continuar",
  skipForNow: "Configurar más tarde",

  resultOk: "Funciona: este modelo puede hacer todo lo que Shortlisted necesita.",
  resultNoVision: "Funciona. Este modelo no lee PDF escaneados, así que sube CV con texto seleccionable (o pégalos).",
  resultBadJson: "El modelo respondió, pero no siguió el formato que Shortlisted necesita. Prueba con uno más grande.",
  resultFailed: "No se pudo conectar con esa dirección.",
  untested: "Sin probar todavía.",
  testedOn: (when: string) => `Probado ${when}`,

  privacyNote: "Tu clave y todo lo que escribas se quedan en este ordenador. Las peticiones van directas de aquí a la dirección de arriba: Shortlisted no está en medio y no ve nada. Pagas a ese proveedor directamente, a sus precios.",

  notConfiguredTitle: "La IA aún no está configurada.",
  notConfiguredBody: "Añade una dirección de API y un modelo para activar los CV a medida, las puntuaciones de ofertas y el relleno inteligente.",
  setUpAi: "Configurar la IA",
}
