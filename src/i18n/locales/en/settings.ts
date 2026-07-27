// The Settings tab: AI setup, language, where we look for forms, backup, reset.

export const settings = {
  title: 'Settings',
  hint: "Your CV, answers and applications stay on this computer. Filling forms needs no setup at all; add your own AI key to turn on CV import, tailoring and fit scores.",

  languageTitle: 'Language',
  languageAuto: 'Auto (browser language)',

  aiTitle: 'AI',
  aiNotSet: 'not set up',
  aiUntested: 'not tested',

  backupTitle: 'Backup',
  backupSummary: 'export / import everything',
  backupHint:
    'Everything lives on this computer, so nothing restores itself if you switch browsers or clear your data. Export a copy now and again — it is the only backup there is.',
  exportJson: 'Export JSON',
  importJson: 'Import JSON',
  imported: 'Imported.',
  importFailed: (msg: string) => `Import failed: ${msg}`,

  detectOn: 'on — every site',
  detectOff: 'off — known job boards only',
  detectHint:
    'Shortlisted watches for job application forms on every site and appears when it recognises one. Pages are checked on your computer and nothing about them is sent anywhere. Turn this off to limit it to the job boards we support directly.',
  detectToggle: 'Recognise application forms on any site',
  whereILook: 'Where I look for forms',

  resetTitle: 'Erase everything',
  resetSummary: 'profile, CVs, applications, answers',
  resetHint:
    'Deletes your profile, CVs, applications, saved jobs and answer bank from this computer. Your AI settings and language are kept. This cannot be undone — export a backup first.',
  resetConfirm: 'Erase it all',
  resetDone: 'Erased.',
}
