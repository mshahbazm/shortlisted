// The AI setup screen — shown once in the first-run wizard, and living in
// Settings after that. One namespace because it is one surface in two places.

export const ai = {
  title: 'Connect your AI.',
  lead: 'Shortlisted runs on your own AI key. Nothing is sent to us — your CV and answers go straight from this browser to the service you pick below.',
  settingsTitle: 'AI',

  providerLabel: 'Where should we send the AI requests?',
  endpointLabel: 'API address',
  endpointPlaceholder: 'https://api.openai.com/v1',
  endpointHint: 'Any OpenAI-compatible API. Pick one above, or type your own.',
  keyLabel: 'API key',
  keyPlaceholder: 'sk-…',
  keyHintLocal: 'Not needed for something running on your own machine.',
  keyHint: 'Stored on this computer only, and sent only to the address above.',
  modelLabel: 'Model',
  modelPlaceholder: 'gpt-5.2',
  modelHint: 'The model that writes — tailored CVs, bios, answers.',
  miniModelLabel: 'Cheaper model (optional)',
  miniModelPlaceholder: 'leave empty to use the same one',
  miniModelHint: 'Used for the bulk work: reading CVs, scoring jobs. A smaller model here cuts the cost a lot.',
  onThisMachine: 'On this machine',

  test: 'Test it',
  testing: 'Testing…',
  testAgain: 'Test again',
  save: 'Save',
  saved: 'Saved',
  continue: 'Continue',
  skipForNow: 'Set this up later',

  resultOk: 'Working — this model can do everything Shortlisted needs.',
  resultNoVision: 'Working. This model can\'t read scanned PDFs, so upload CVs with selectable text (or paste them).',
  resultBadJson: "This model replied, but couldn't follow the format Shortlisted needs. Try a bigger model.",
  resultFailed: "Couldn't reach that endpoint.",
  untested: 'Not tested yet.',
  testedOn: (when: string) => `Tested ${when}`,

  whatItCosts: 'What this costs',
  whatItCostsBody:
    'You pay your AI provider directly, at their prices. A tailored CV is usually a fraction of a cent on a cheap model, a few cents on a top one. Shortlisted takes nothing and never sees your key.',

  notConfiguredTitle: 'AI is not set up yet.',
  notConfiguredBody: 'Add an API address and a model to turn on CV tailoring, job scoring, and smart form filling.',
  setUpAi: 'Set up AI',
}
