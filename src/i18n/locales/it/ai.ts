// The AI setup screen — shown once in the first-run wizard, and living in
// Settings after that. One namespace because it is one surface in two places.

export const ai = {
  title: "Collega la tua IA.",
  lead: "Shortlisted funziona con la tua chiave IA. A noi non arriva nulla: il tuo CV e le tue risposte vanno direttamente da questo browser al servizio che scegli qui sotto.",
  settingsTitle: "IA",

  providerLabel: "Dove mandiamo le richieste IA?",
  endpointLabel: "Indirizzo API",
  endpointPlaceholder: "https://api.openai.com/v1",
  endpointHint: "Qualsiasi API compatibile con OpenAI. Scegline una sopra, o scrivi la tua.",
  keyLabel: "Chiave API",
  keyPlaceholder: "sk-…",
  keyHintLocal: "Non serve per qualcosa che gira sul tuo computer.",
  keyHint: "Salvata solo su questo computer e inviata solo all’indirizzo qui sopra.",
  modelLabel: "Modello",
  modelPlaceholder: "gpt-5.2",
  modelHint: "Il modello che scrive: CV su misura, bio, risposte.",
  miniModelLabel: "Modello più economico (facoltativo)",
  miniModelPlaceholder: "lascia vuoto per usare lo stesso",
  miniModelHint: "Per il lavoro grosso: leggere i CV, valutare gli annunci. Un modello più piccolo qui abbatte i costi.",
  onThisMachine: "Su questo computer",

  test: "Prova",
  testing: "Prova in corso…",
  testAgain: "Riprova",
  save: "Salva",
  saved: "Salvato",
  continue: "Continua",
  skipForNow: "Configura più tardi",

  resultOk: "Funziona: questo modello sa fare tutto ciò che serve a Shortlisted.",
  resultNoVision: "Funziona. Questo modello non legge i PDF scansionati: carica CV con testo selezionabile (o incollali).",
  resultBadJson: "Il modello ha risposto, ma non nel formato che serve a Shortlisted. Prova con uno più grande.",
  resultFailed: "Non è stato possibile raggiungere quell’indirizzo.",
  untested: "Non ancora provato.",
  testedOn: (when: string) => `Provato ${when}`,

  whatItCosts: "Quanto costa",
  whatItCostsBody: "Paghi direttamente il tuo fornitore di IA, ai suoi prezzi. Un CV su misura costa di solito una frazione di centesimo su un modello economico, qualche centesimo su uno di fascia alta. Shortlisted non prende nulla e non vede mai la tua chiave.",

  notConfiguredTitle: "L’IA non è ancora configurata.",
  notConfiguredBody: "Aggiungi un indirizzo API e un modello per attivare CV su misura, punteggi degli annunci e compilazione intelligente.",
  setUpAi: "Configura l’IA",
}
