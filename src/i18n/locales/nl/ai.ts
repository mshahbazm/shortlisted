// The AI setup screen — shown once in the first-run wizard, and living in
// Settings after that. One namespace because it is one surface in two places.
//
// Deliberately terse. It is a form on a 400px panel, and every explanatory
// sentence pushes the Save button further off screen.

export const ai = {
  title: "Koppel je AI.",
  lead: "Draait op je eigen sleutel. Er komt niets bij ons terecht.",
  settingsTitle: "AI",

  endpointLabel: "API-adres",
  endpointPlaceholder: "https://api.openai.com/v1",
  endpointHint: "Elke OpenAI-compatibele API.",
  keyLabel: "API-sleutel",
  keyPlaceholder: "sk-…",
  keyHintLocal: "Niet nodig voor een model op deze computer.",
  keyHint: "Alleen op deze computer opgeslagen.",
  modelLabel: "Model",
  modelPlaceholder: "gpt-5.2",

  test: "Testen",
  testing: "Bezig…",
  testAgain: "Opnieuw testen",
  save: "Opslaan",
  continue: "Doorgaan",
  skipForNow: "Later instellen",

  resultOk: "Werkt — dit model kan alles wat Shortlisted nodig heeft.",
  resultNoVision: "Werkt. Het leest geen gescande pdf’s, dus upload cv’s met selecteerbare tekst.",
  resultBadJson: "Het antwoordde, maar niet in het formaat dat Shortlisted nodig heeft. Probeer een groter model.",
  resultFailed: "Kon dat adres niet bereiken.",

  privacyNote: "Je sleutel en alles wat je schrijft blijven op deze computer. Je betaalt je aanbieder rechtstreeks.",
}
