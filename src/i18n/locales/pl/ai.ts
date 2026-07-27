// The AI setup screen — shown once in the first-run wizard, and living in
// Settings after that. One namespace because it is one surface in two places.

export const ai = {
  title: "Podłącz swoją AI.",
  lead: "Shortlisted działa na Twoim własnym kluczu AI. Do nas nie trafia nic — Twoje CV i odpowiedzi idą prosto z tej przeglądarki do usługi, którą wybierzesz poniżej.",
  settingsTitle: "AI",

  providerLabel: "Dokąd mamy wysyłać zapytania do AI?",
  endpointLabel: "Adres API",
  endpointPlaceholder: "https://api.openai.com/v1",
  endpointHint: "Dowolne API zgodne z OpenAI. Wybierz jedno powyżej albo wpisz własne.",
  keyLabel: "Klucz API",
  keyPlaceholder: "sk-…",
  keyHintLocal: "Niepotrzebny dla czegoś, co działa na Twoim komputerze.",
  keyHint: "Zapisany tylko na tym komputerze i wysyłany wyłącznie pod powyższy adres.",
  modelLabel: "Model",
  modelPlaceholder: "gpt-5.2",
  modelHint: "Model, który pisze — dopasowane CV, opisy, odpowiedzi.",
  miniModelLabel: "Tańszy model (opcjonalnie)",
  miniModelPlaceholder: "zostaw puste, aby użyć tego samego",
  miniModelHint: "Do czarnej roboty: czytania CV, oceny ofert. Mniejszy model mocno tu obniża koszt.",
  onThisMachine: "Na tym komputerze",

  test: "Przetestuj",
  testing: "Testowanie…",
  testAgain: "Przetestuj ponownie",
  save: "Zapisz",
  saved: "Zapisano",
  continue: "Dalej",
  skipForNow: "Skonfiguruj później",

  resultOk: "Działa — ten model potrafi wszystko, czego potrzebuje Shortlisted.",
  resultNoVision: "Działa. Ten model nie czyta skanów PDF, więc wgrywaj CV z zaznaczalnym tekstem (albo je wklejaj).",
  resultBadJson: "Model odpowiedział, ale nie trzymał się formatu, którego potrzebuje Shortlisted. Spróbuj większego modelu.",
  resultFailed: "Nie udało się połączyć z tym adresem.",
  untested: "Jeszcze nieprzetestowane.",
  testedOn: (when: string) => `Przetestowano ${when}`,

  whatItCosts: "Ile to kosztuje",
  whatItCostsBody: "Płacisz bezpośrednio swojemu dostawcy AI, według jego cennika. Dopasowane CV to zwykle ułamek grosza na tanim modelu i kilka groszy na najlepszym. Shortlisted nie bierze nic i nigdy nie widzi Twojego klucza.",

  notConfiguredTitle: "AI nie jest jeszcze skonfigurowane.",
  notConfiguredBody: "Dodaj adres API i model, aby włączyć dopasowywanie CV, ocenę ofert i inteligentne wypełnianie.",
  setUpAi: "Skonfiguruj AI",
}
