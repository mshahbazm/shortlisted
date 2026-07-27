// The AI setup screen — shown once in the first-run wizard, and living in
// Settings after that. One namespace because it is one surface in two places.

export const ai = {
  title: "Verbinde deine KI.",
  lead: "Shortlisted läuft mit deinem eigenen KI-Schlüssel. Zu uns geht nichts — dein Lebenslauf und deine Antworten gehen direkt von diesem Browser an den Dienst, den du unten wählst.",
  settingsTitle: "KI",

  providerLabel: "Wohin sollen die KI-Anfragen gehen?",
  endpointLabel: "API-Adresse",
  endpointPlaceholder: "https://api.openai.com/v1",
  endpointHint: "Jede OpenAI-kompatible API. Wähle oben eine aus oder trage deine eigene ein.",
  keyLabel: "API-Schlüssel",
  keyPlaceholder: "sk-…",
  keyHintLocal: "Nicht nötig für etwas, das auf deinem eigenen Rechner läuft.",
  keyHint: "Nur auf diesem Computer gespeichert und nur an die Adresse oben gesendet.",
  modelLabel: "Modell",
  modelPlaceholder: "gpt-5.2",
  modelHint: "Das Modell, das schreibt — zugeschnittene Lebensläufe, Kurzprofile, Antworten.",
  miniModelLabel: "Günstigeres Modell (optional)",
  miniModelPlaceholder: "leer lassen, um dasselbe zu nutzen",
  miniModelHint: "Für die Fleißarbeit: Lebensläufe lesen, Stellen bewerten. Ein kleineres Modell spart hier viel.",
  onThisMachine: "Auf diesem Rechner",

  test: "Testen",
  testing: "Wird getestet…",
  testAgain: "Erneut testen",
  save: "Speichern",
  saved: "Gespeichert",
  continue: "Weiter",
  skipForNow: "Später einrichten",

  resultOk: "Funktioniert — dieses Modell kann alles, was Shortlisted braucht.",
  resultNoVision: "Funktioniert. Dieses Modell kann keine gescannten PDFs lesen — lade Lebensläufe mit markierbarem Text hoch (oder füge sie ein).",
  resultBadJson: "Das Modell hat geantwortet, aber nicht im Format, das Shortlisted braucht. Versuch ein größeres Modell.",
  resultFailed: "Diese Adresse war nicht erreichbar.",
  untested: "Noch nicht getestet.",
  testedOn: (when: string) => `Getestet ${when}`,

  privacyNote: "Dein Schlüssel und alles, was du schreibst, bleiben auf diesem Computer. Anfragen gehen direkt von hier an die Adresse oben — Shortlisted sitzt nicht dazwischen und sieht nichts davon. Du zahlst direkt an den Anbieter, zu dessen Preisen.",

  notConfiguredTitle: "Die KI ist noch nicht eingerichtet.",
  notConfiguredBody: "Trage eine API-Adresse und ein Modell ein, um zugeschnittene Lebensläufe, Stellenbewertungen und schlaues Ausfüllen zu aktivieren.",
  setUpAi: "KI einrichten",
}
