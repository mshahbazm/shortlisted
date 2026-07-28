// The AI setup screen — shown once in the first-run wizard, and living in
// Settings after that. One namespace because it is one surface in two places.
//
// Deliberately terse. It is a form on a 400px panel, and every explanatory
// sentence pushes the Save button further off screen.

export const ai = {
  title: "Podłącz swoją AI.",
  lead: "Działa na Twoim kluczu. Do nas nie trafia nic.",
  settingsTitle: "AI",

  endpointLabel: "Adres API",
  endpointPlaceholder: "https://api.openai.com/v1",
  endpointHint: "Dowolne API zgodne z OpenAI.",
  keyLabel: "Klucz API",
  keyPlaceholder: "sk-…",
  keyHintLocal: "Niepotrzebny dla modelu na tym komputerze.",
  keyHint: "Zapisany tylko na tym komputerze.",
  modelLabel: "Model",
  modelPlaceholder: "gpt-5.6-luna",

  test: "Przetestuj",
  testing: "Testowanie…",
  testAgain: "Przetestuj ponownie",
  mustTest: "Przetestuj połączenie, aby przejść dalej.",
  save: "Zapisz",
  continue: "Dalej",
  skipForNow: "Skonfiguruj później",

  resultOk: "Działa — ten model potrafi wszystko, czego potrzebuje Shortlisted.",
  resultNoVision: "Działa. Nie czyta obrazów, więc zeskanowane CV trzeba będzie wkleić jako tekst.",
  resultBadJson: "Odpowiedział, ale nie w wymaganym formacie. Spróbuj większego modelu.",
  resultFailed: "Nie udało się połączyć z tym adresem.",

  privacyNote: "Twój klucz i wszystko, co piszesz, zostają na tym komputerze. Płacisz swojemu dostawcy bezpośrednio.",
}
