// The AI setup screen — shown once in the first-run wizard, and living in
// Settings after that. One namespace because it is one surface in two places.
//
// Deliberately terse. It is a form on a 400px panel, and every explanatory
// sentence pushes the Save button further off screen.

export const ai = {
  title: "Collega la tua IA.",
  lead: "Funziona con la tua chiave. A noi non arriva nulla.",
  settingsTitle: "IA",

  endpointLabel: "Indirizzo API",
  endpointPlaceholder: "https://api.openai.com/v1",
  endpointHint: "Qualsiasi API compatibile con OpenAI.",
  keyLabel: "Chiave API",
  keyPlaceholder: "sk-…",
  keyHintLocal: "Non serve per un modello su questo computer.",
  keyHint: "Salvata solo su questo computer.",
  modelLabel: "Modello",
  modelPlaceholder: "gpt-5.6-luna",

  test: "Prova",
  testing: "Prova…",
  testAgain: "Riprova",
  mustTest: "Prova la connessione per continuare.",
  save: "Salva",
  continue: "Continua",
  skipForNow: "Configura più tardi",

  resultOk: "Funziona: questo modello sa fare tutto ciò che serve a Shortlisted.",
  resultNoVision: "Funziona. Non legge i PDF scansionati: carica CV con testo selezionabile.",
  resultBadJson: "Ha risposto, ma non nel formato necessario. Prova con uno più grande.",
  resultFailed: "Non è stato possibile raggiungere quell’indirizzo.",

  privacyNote: "La tua chiave e tutto ciò che scrivi restano su questo computer. Paghi il tuo fornitore direttamente.",
}
