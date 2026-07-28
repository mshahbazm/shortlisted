// The AI setup screen — shown once in the first-run wizard, and living in
// Settings after that. One namespace because it is one surface in two places.
//
// Deliberately terse. It is a form on a 400px panel, and every explanatory
// sentence pushes the Save button further off screen.

export const ai = {
  title: "KI verbinden.",
  lead: "Läuft mit deinem eigenen Schlüssel. Zu uns kommt nichts.",
  settingsTitle: "KI",

  endpointLabel: "API-Adresse",
  endpointPlaceholder: "https://api.openai.com/v1",
  endpointHint: "Jede OpenAI-kompatible API.",
  keyLabel: "API-Schlüssel",
  keyPlaceholder: "sk-…",
  keyHintLocal: "Für ein Modell auf diesem Rechner nicht nötig.",
  keyHint: "Nur auf diesem Computer gespeichert.",
  modelLabel: "Modell",
  modelPlaceholder: "gpt-5.2",

  test: "Testen",
  testing: "Läuft…",
  testAgain: "Erneut testen",
  save: "Speichern",
  continue: "Weiter",
  skipForNow: "Später einrichten",

  resultOk: "Funktioniert — dieses Modell kann alles, was Shortlisted braucht.",
  resultNoVision: "Funktioniert. Gescannte PDFs liest es nicht — lade Lebensläufe mit markierbarem Text hoch.",
  resultBadJson: "Es hat geantwortet, aber nicht im nötigen Format. Versuch ein größeres Modell.",
  resultFailed: "Diese Adresse war nicht erreichbar.",

  privacyNote: "Dein Schlüssel und alles, was du schreibst, bleiben auf diesem Computer. Du zahlst direkt an deinen Anbieter.",
}
