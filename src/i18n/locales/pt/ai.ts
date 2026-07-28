// The AI setup screen — shown once in the first-run wizard, and living in
// Settings after that. One namespace because it is one surface in two places.
//
// Deliberately terse. It is a form on a 400px panel, and every explanatory
// sentence pushes the Save button further off screen.

export const ai = {
  title: "Liga a tua IA.",
  lead: "Funciona com a tua chave. Até nós não chega nada.",
  settingsTitle: "IA",

  endpointLabel: "Endereço da API",
  endpointPlaceholder: "https://api.openai.com/v1",
  endpointHint: "Qualquer API compatível com OpenAI.",
  keyLabel: "Chave da API",
  keyPlaceholder: "sk-…",
  keyHintLocal: "Não é preciso para um modelo neste computador.",
  keyHint: "Guardada só neste computador.",
  modelLabel: "Modelo",
  modelPlaceholder: "gpt-5.6-luna",

  test: "Testar",
  testing: "A testar…",
  testAgain: "Testar de novo",
  mustTest: "Testa a ligação para continuares.",
  save: "Guardar",
  continue: "Continuar",
  skipForNow: "Configurar mais tarde",

  resultOk: "Funciona — este modelo faz tudo o que o Shortlisted precisa.",
  resultNoVision: "Funciona. Não lê imagens, por isso um CV digitalizado terá de ser colado como texto.",
  resultBadJson: "Respondeu, mas não no formato necessário. Experimenta um modelo maior.",
  resultFailed: "Não foi possível chegar a esse endereço.",

  privacyNote: "A tua chave e tudo o que escreves ficam neste computador. Pagas ao teu fornecedor diretamente.",
}
