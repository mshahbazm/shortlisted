// The Settings tab: AI setup, language, where we look for forms, backup, reset.

export const settings = {
  title: "Impostazioni",
  hint: "Compilare i moduli funziona senza configurare nulla. La tua chiave IA attiva l’import del CV, la personalizzazione e i punteggi degli annunci.",

  languageTitle: "Lingua",
  languageAuto: "Automatica (lingua del browser)",

  aiTitle: "IA",
  aiNotSet: "non configurata",
  aiUntested: "non provata",

  backupTitle: "Backup",
  backupSummary: "esporta / importa tutto",
  backupHint: "Tutto sta su questo computer, quindi non si ripristina da solo se cambi browser o cancelli i dati. Esporta una copia ogni tanto: è l’unico backup che esiste.",
  exportJson: "Esporta JSON",
  importJson: "Importa JSON",
  imported: "Importato.",
  importFailed: (msg: string) => `Import non riuscito: ${msg}`,

  detectOn: "attivo — tutti i siti",
  detectOff: "spento — solo i portali di lavoro noti",
  detectHint: "Shortlisted cerca moduli di candidatura su ogni sito e compare quando ne riconosce uno. Le pagine vengono controllate sul tuo computer e non ne esce nulla. Disattiva per limitarti ai portali di lavoro che supportiamo direttamente.",
  detectToggle: "Riconosci i moduli di candidatura su qualsiasi sito",
  whereILook: "Dove cerco i moduli",

  resetTitle: "Cancella tutto",
  resetSummary: "profilo, CV, candidature, risposte",
  resetHint: "Elimina da questo computer il profilo, i CV, le candidature, gli annunci salvati e la raccolta di risposte. Le impostazioni IA e la lingua restano. Non si può annullare: esporta prima un backup.",
  resetConfirm: "Cancella tutto",
  resetDone: "Cancellato.",
}
