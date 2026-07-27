// The AI setup screen — shown once in the first-run wizard, and living in
// Settings after that. One namespace because it is one surface in two places.

export const ai = {
  title: "Connectez votre IA.",
  lead: "Shortlisted fonctionne avec votre propre clé d’IA. Rien ne nous est envoyé — votre CV et vos réponses vont directement de ce navigateur au service que vous choisissez ci-dessous.",
  settingsTitle: "IA",

  providerLabel: "Où envoyer les requêtes d’IA ?",
  endpointLabel: "Adresse de l’API",
  endpointPlaceholder: "https://api.openai.com/v1",
  endpointHint: "N’importe quelle API compatible OpenAI. Choisissez-en une ci-dessus, ou saisissez la vôtre.",
  keyLabel: "Clé d’API",
  keyPlaceholder: "sk-…",
  keyHintLocal: "Inutile pour un service qui tourne sur votre propre machine.",
  keyHint: "Conservée sur cet ordinateur uniquement, et envoyée seulement à l’adresse ci-dessus.",
  modelLabel: "Modèle",
  modelPlaceholder: "gpt-5.2",
  modelHint: "Le modèle qui rédige — CV sur mesure, bios, réponses.",
  miniModelLabel: "Modèle moins cher (facultatif)",
  miniModelPlaceholder: "laissez vide pour utiliser le même",
  miniModelHint: "Pour le gros du travail : lire les CV, évaluer les offres. Un modèle plus petit réduit beaucoup le coût.",
  onThisMachine: "Sur cette machine",

  test: "Tester",
  testing: "Test en cours…",
  testAgain: "Tester à nouveau",
  save: "Enregistrer",
  saved: "Enregistré",
  continue: "Continuer",
  skipForNow: "Configurer plus tard",

  resultOk: "Ça marche — ce modèle sait tout faire ce dont Shortlisted a besoin.",
  resultNoVision: "Ça marche. Ce modèle ne lit pas les PDF scannés : importez des CV dont le texte est sélectionnable (ou collez-les).",
  resultBadJson: "Le modèle a répondu, mais sans respecter le format attendu par Shortlisted. Essayez un modèle plus grand.",
  resultFailed: "Impossible de joindre cette adresse.",
  untested: "Pas encore testé.",
  testedOn: (when: string) => `Testé ${when}`,

  privacyNote: "Votre clé et tout ce que vous écrivez restent sur cet ordinateur. Les requêtes partent d’ici directement vers l’adresse ci-dessus — Shortlisted n’est pas entre les deux et n’en voit rien. Vous payez ce fournisseur directement, à ses tarifs.",

  notConfiguredTitle: "L’IA n’est pas encore configurée.",
  notConfiguredBody: "Ajoutez une adresse d’API et un modèle pour activer les CV sur mesure, les scores d’offres et le remplissage intelligent.",
  setUpAi: "Configurer l’IA",
}
