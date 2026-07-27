// The AI setup screen — shown once in the first-run wizard, and living in
// Settings after that. One namespace because it is one surface in two places.

export const ai = {
  title: "Koppel je AI.",
  lead: "Shortlisted draait op je eigen AI-sleutel. Er gaat niets naar ons — je cv en antwoorden gaan rechtstreeks van deze browser naar de dienst die je hieronder kiest.",
  settingsTitle: "AI",

  providerLabel: "Waar sturen we de AI-verzoeken heen?",
  endpointLabel: "API-adres",
  endpointPlaceholder: "https://api.openai.com/v1",
  endpointHint: "Elke OpenAI-compatibele API. Kies er hierboven een, of typ je eigen adres.",
  keyLabel: "API-sleutel",
  keyPlaceholder: "sk-…",
  keyHintLocal: "Niet nodig voor iets dat op je eigen computer draait.",
  keyHint: "Alleen op deze computer opgeslagen, en alleen naar het adres hierboven gestuurd.",
  modelLabel: "Model",
  modelPlaceholder: "gpt-5.2",
  modelHint: "Het model dat schrijft — cv\u0027s op maat, bio\u0027s, antwoorden.",
  miniModelLabel: "Goedkoper model (optioneel)",
  miniModelPlaceholder: "leeg laten om hetzelfde te gebruiken",
  miniModelHint: "Voor het zware werk: cv\u0027s lezen, vacatures scoren. Een kleiner model scheelt hier veel kosten.",
  onThisMachine: "Op deze computer",

  test: "Testen",
  testing: "Bezig met testen…",
  testAgain: "Opnieuw testen",
  save: "Opslaan",
  saved: "Opgeslagen",
  continue: "Doorgaan",
  skipForNow: "Later instellen",

  resultOk: "Werkt — dit model kan alles wat Shortlisted nodig heeft.",
  resultNoVision: "Werkt. Dit model kan geen gescande pdf\u0027s lezen, dus upload cv\u0027s met selecteerbare tekst (of plak ze).",
  resultBadJson: "Dit model antwoordde, maar hield zich niet aan het formaat dat Shortlisted nodig heeft. Probeer een groter model.",
  resultFailed: "Kon dat adres niet bereiken.",
  untested: "Nog niet getest.",
  testedOn: (when: string) => `Getest ${when}`,

  privacyNote: "Je sleutel en alles wat je schrijft blijven op deze computer. Verzoeken gaan rechtstreeks van hier naar het adres hierboven — Shortlisted zit er niet tussen en ziet er niets van. Je betaalt die aanbieder rechtstreeks, tegen hun tarieven.",

  notConfiguredTitle: "AI is nog niet ingesteld.",
  notConfiguredBody: "Voeg een API-adres en een model toe om cv\u0027s op maat, vacaturescores en slim invullen aan te zetten.",
  setUpAi: "AI instellen",
}
