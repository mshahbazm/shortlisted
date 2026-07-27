// The Settings tab: AI setup, language, where we look for forms, backup, reset.

export const settings = {
  title: "Ustawienia",
  hint: "Wypełnianie formularzy działa bez żadnej konfiguracji. Twój własny klucz AI włącza import CV, dopasowywanie i ocenę ofert.",

  languageTitle: "Język",
  languageAuto: "Automatycznie (język przeglądarki)",

  aiTitle: "AI",
  aiNotSet: "nieskonfigurowane",
  aiUntested: "nieprzetestowane",

  backupTitle: "Kopia zapasowa",
  backupSummary: "eksportuj / importuj wszystko",
  backupHint: "Wszystko jest na tym komputerze, więc nic nie odtworzy się samo, gdy zmienisz przeglądarkę albo wyczyścisz dane. Od czasu do czasu wyeksportuj kopię — to jedyna kopia, jaka istnieje.",
  exportJson: "Eksportuj JSON",
  importJson: "Importuj JSON",
  imported: "Zaimportowano.",
  importFailed: (msg: string) => `Import nie powiódł się: ${msg}`,

  detectOn: "włączone — każda strona",
  detectOff: "wyłączone — tylko znane portale pracy",
  detectHint: "Shortlisted wypatruje formularzy aplikacyjnych na każdej stronie i pojawia się, gdy któryś rozpozna. Strony są sprawdzane na Twoim komputerze i nic o nich nigdzie nie trafia. Wyłącz, aby ograniczyć się do bezpośrednio wspieranych portali pracy.",
  detectToggle: "Rozpoznawaj formularze aplikacyjne na każdej stronie",
  whereILook: "Gdzie szukam formularzy",

  resetTitle: "Wymaż wszystko",
  resetSummary: "profil, CV, aplikacje, odpowiedzi",
  resetHint: "Usuwa z tego komputera Twój profil, CV, aplikacje, zapisane oferty i bazę odpowiedzi. Ustawienia AI i język zostają. Tego nie da się cofnąć — najpierw wyeksportuj kopię.",
  resetConfirm: "Wymaż wszystko",
  resetDone: "Wymazano.",
}
