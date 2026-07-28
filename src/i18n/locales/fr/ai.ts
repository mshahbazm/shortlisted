// The AI setup screen — shown once in the first-run wizard, and living in
// Settings after that. One namespace because it is one surface in two places.
//
// Deliberately terse. It is a form on a 400px panel, and every explanatory
// sentence pushes the Save button further off screen.

export const ai = {
  title: "Connectez votre IA.",
  lead: "Fonctionne avec votre clé. Rien ne nous parvient.",
  settingsTitle: "IA",

  endpointLabel: "Adresse de l’API",
  endpointPlaceholder: "https://api.openai.com/v1",
  endpointHint: "Toute API compatible OpenAI.",
  keyLabel: "Clé d’API",
  keyPlaceholder: "sk-…",
  keyHintLocal: "Inutile pour un modèle sur cette machine.",
  keyHint: "Conservée sur cet ordinateur uniquement.",
  modelLabel: "Modèle",
  modelPlaceholder: "gpt-5.2",

  test: "Tester",
  testing: "Test…",
  testAgain: "Tester à nouveau",
  save: "Enregistrer",
  continue: "Continuer",
  skipForNow: "Configurer plus tard",

  resultOk: "Ça marche — ce modèle sait tout faire ce dont Shortlisted a besoin.",
  resultNoVision: "Ça marche. Il ne lit pas les PDF scannés : importez des CV au texte sélectionnable.",
  resultBadJson: "Il a répondu, mais pas au format attendu. Essayez un modèle plus grand.",
  resultFailed: "Impossible de joindre cette adresse.",

  privacyNote: "Votre clé et tout ce que vous écrivez restent sur cet ordinateur. Vous payez votre fournisseur directement.",
}
