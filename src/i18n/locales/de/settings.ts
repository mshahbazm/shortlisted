// The Settings tab: AI setup, language, where we look for forms, backup, reset.

export const settings = {
  title: "Einstellungen",
  hint: "Dein Lebenslauf, deine Antworten und deine Bewerbungen bleiben auf diesem Computer. Das Ausfüllen braucht keine Einrichtung; mit deinem eigenen KI-Schlüssel kommen Lebenslauf-Import, Zuschnitt und Stellenbewertungen dazu.",

  languageTitle: "Sprache",
  languageAuto: "Automatisch (Browsersprache)",

  aiTitle: "KI",
  aiNotSet: "nicht eingerichtet",
  aiUntested: "nicht getestet",

  backupTitle: "Sicherung",
  backupSummary: "alles exportieren / importieren",
  backupHint: "Alles liegt auf diesem Computer — beim Browserwechsel oder Löschen der Daten stellt sich nichts von selbst wieder her. Exportiere ab und zu eine Kopie; eine andere Sicherung gibt es nicht.",
  exportJson: "JSON exportieren",
  importJson: "JSON importieren",
  imported: "Importiert.",
  importFailed: (msg: string) => `Import fehlgeschlagen: ${msg}`,

  detectOn: "an — jede Seite",
  detectOff: "aus — nur bekannte Jobbörsen",
  detectHint: "Shortlisted achtet auf jeder Seite auf Bewerbungsformulare und meldet sich, sobald es eines erkennt. Seiten werden auf deinem Computer geprüft, und nichts davon wird irgendwohin gesendet. Schalte das aus, um es auf die direkt unterstützten Jobbörsen zu beschränken.",
  detectToggle: "Bewerbungsformulare auf jeder Seite erkennen",
  whereILook: "Wo ich nach Formularen suche",

  resetTitle: "Alles löschen",
  resetSummary: "Profil, Lebensläufe, Bewerbungen, Antworten",
  resetHint: "Löscht Profil, Lebensläufe, Bewerbungen, gemerkte Stellen und Antwortsammlung von diesem Computer. KI-Einstellungen und Sprache bleiben erhalten. Das lässt sich nicht rückgängig machen — exportiere vorher eine Sicherung.",
  resetConfirm: "Alles löschen",
  resetDone: "Gelöscht.",
}
