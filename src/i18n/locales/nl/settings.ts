// The Settings tab: AI setup, language, where we look for forms, backup, reset.

export const settings = {
  title: "Instellingen",
  hint: "Formulieren invullen werkt zonder instellen. Je eigen AI-sleutel zet cv-import, op maat maken en vacaturescores aan.",

  languageTitle: "Taal",
  languageAuto: "Automatisch (browsertaal)",

  aiTitle: "AI",
  aiNotSet: "niet ingesteld",
  aiUntested: "niet getest",

  backupTitle: "Back-up",
  backupSummary: "alles exporteren / importeren",
  backupHint: "Alles staat op deze computer, dus er wordt niets vanzelf hersteld als je van browser wisselt of je gegevens wist. Exporteer af en toe een kopie — het is de enige back-up die er is.",
  exportJson: "JSON exporteren",
  importJson: "JSON importeren",
  imported: "Geïmporteerd.",
  importFailed: (msg: string) => `Importeren mislukt: ${msg}`,

  detectOn: "aan — elke site",
  detectOff: "uit — alleen bekende vacaturesites",
  detectHint: "Shortlisted let op elke site op sollicitatieformulieren en verschijnt zodra het er een herkent. Pagina\u0027s worden op je eigen computer bekeken en er wordt niets over verstuurd. Zet dit uit om het te beperken tot de vacaturesites die we direct ondersteunen.",
  detectToggle: "Sollicitatieformulieren op elke site herkennen",
  whereILook: "Waar ik naar formulieren zoek",

  resetTitle: "Alles wissen",
  resetSummary: "profiel, cv\u0027s, sollicitaties, antwoorden",
  resetHint: "Verwijdert je profiel, cv\u0027s, sollicitaties, bewaarde vacatures en antwoordenbank van deze computer. Je AI-instellingen en taal blijven staan. Dit kan niet ongedaan worden gemaakt — exporteer eerst een back-up.",
  resetConfirm: "Alles wissen",
  resetDone: "Gewist.",
}
