// The AI setup screen — shown once in the first-run wizard, and living in
// Settings after that. One namespace because it is one surface in two places.
//
// Deliberately terse. It is a form on a 400px panel, and every explanatory
// sentence pushes the Save button further off screen.

export const ai = {
  title: "Connect your AI.",
  lead: "Runs on your own key. Nothing comes to us.",
  settingsTitle: "AI",

  endpointLabel: "API address",
  endpointPlaceholder: "https://api.openai.com/v1",
  endpointHint: "Any OpenAI-compatible API.",
  keyLabel: "API key",
  keyPlaceholder: "sk-…",
  keyHintLocal: "Not needed for a model on this machine.",
  keyHint: "Stored on this computer only.",
  modelLabel: "Model",
  modelPlaceholder: "gpt-5.6-luna",

  test: "Test it",
  testing: "Testing…",
  testAgain: "Test again",
  mustTest: "Test the connection to continue.",
  save: "Save",
  continue: "Continue",
  skipForNow: "Set this up later",

  resultOk: "Working — this model can do everything Shortlisted needs.",
  resultNoVision: "Working. It can’t read scanned PDFs, so upload CVs with selectable text.",
  resultBadJson: "It replied, but not in the format Shortlisted needs. Try a bigger model.",
  resultFailed: "Couldn’t reach that endpoint.",

  privacyNote: "Your key and everything you write stay on this computer. You pay your provider directly.",
}
