// The Settings tab: AI setup, language, where we look for forms, backup, reset.

export const settings = {
  title: "Réglages",
  hint: "Votre CV, vos réponses et vos candidatures restent sur cet ordinateur. Le remplissage ne demande aucune configuration ; ajoutez votre clé d’IA pour l’import de CV, la personnalisation et les scores d’offres.",

  languageTitle: "Langue",
  languageAuto: "Automatique (langue du navigateur)",

  aiTitle: "IA",
  aiNotSet: "non configurée",
  aiUntested: "non testée",

  backupTitle: "Sauvegarde",
  backupSummary: "tout exporter / importer",
  backupHint: "Tout est sur cet ordinateur : rien ne se restaure tout seul si vous changez de navigateur ou effacez vos données. Exportez une copie de temps en temps — c’est la seule sauvegarde qui existe.",
  exportJson: "Exporter en JSON",
  importJson: "Importer un JSON",
  imported: "Importé.",
  importFailed: (msg: string) => `Échec de l’import: ${msg}`,

  detectOn: "activé — tous les sites",
  detectOff: "désactivé — sites d’emploi connus uniquement",
  detectHint: "Shortlisted guette les formulaires de candidature sur tous les sites et se manifeste dès qu’il en reconnaît un. Les pages sont analysées sur votre ordinateur et rien n’en sort. Désactivez pour vous limiter aux sites d’emploi pris en charge directement.",
  detectToggle: "Reconnaître les formulaires de candidature sur tous les sites",
  whereILook: "Où je cherche des formulaires",

  resetTitle: "Tout effacer",
  resetSummary: "profil, CV, candidatures, réponses",
  resetHint: "Supprime votre profil, vos CV, vos candidatures, vos offres enregistrées et votre banque de réponses de cet ordinateur. Vos réglages d’IA et votre langue sont conservés. Irréversible — exportez d’abord une sauvegarde.",
  resetConfirm: "Tout effacer",
  resetDone: "Effacé.",
}
