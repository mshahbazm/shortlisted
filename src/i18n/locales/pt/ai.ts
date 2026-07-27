// The AI setup screen — shown once in the first-run wizard, and living in
// Settings after that. One namespace because it is one surface in two places.

export const ai = {
  title: "Liga a tua IA.",
  lead: "O Shortlisted funciona com a tua própria chave de IA. Nada chega até nós — o teu CV e as tuas respostas vão diretamente deste navegador para o serviço que escolheres abaixo.",
  settingsTitle: "IA",

  providerLabel: "Para onde enviamos os pedidos de IA?",
  endpointLabel: "Endereço da API",
  endpointPlaceholder: "https://api.openai.com/v1",
  endpointHint: "Qualquer API compatível com OpenAI. Escolhe uma acima, ou escreve a tua.",
  keyLabel: "Chave da API",
  keyPlaceholder: "sk-…",
  keyHintLocal: "Não é preciso para algo que corre no teu próprio computador.",
  keyHint: "Guardada só neste computador e enviada apenas para o endereço acima.",
  modelLabel: "Modelo",
  modelPlaceholder: "gpt-5.2",
  modelHint: "O modelo que escreve: CV à medida, biografias, respostas.",
  miniModelLabel: "Modelo mais barato (opcional)",
  miniModelPlaceholder: "deixa vazio para usar o mesmo",
  miniModelHint: "Para o trabalho pesado: ler CV, pontuar vagas. Um modelo mais pequeno aqui corta muito no custo.",
  onThisMachine: "Neste computador",

  test: "Testar",
  testing: "A testar…",
  testAgain: "Testar de novo",
  save: "Guardar",
  saved: "Guardado",
  continue: "Continuar",
  skipForNow: "Configurar mais tarde",

  resultOk: "Funciona — este modelo faz tudo o que o Shortlisted precisa.",
  resultNoVision: "Funciona. Este modelo não lê PDF digitalizados, por isso carrega CV com texto selecionável (ou cola-os).",
  resultBadJson: "O modelo respondeu, mas não seguiu o formato de que o Shortlisted precisa. Experimenta um modelo maior.",
  resultFailed: "Não foi possível chegar a esse endereço.",
  untested: "Ainda não testado.",
  testedOn: (when: string) => `Testado ${when}`,

  privacyNote: "A tua chave e tudo o que escreves ficam neste computador. Os pedidos vão daqui diretamente para o endereço acima — o Shortlisted não está pelo meio e não vê nada. Pagas a esse fornecedor diretamente, aos preços dele.",

  notConfiguredTitle: "A IA ainda não está configurada.",
  notConfiguredBody: "Adiciona um endereço de API e um modelo para ligar os CV à medida, as pontuações de vagas e o preenchimento inteligente.",
  setUpAi: "Configurar a IA",
}
