// The Apply tab: queue, fill, fit checker, applied log.

export const apply = {
  inQueue: 'in queue',
  applied: 'applied',
  openNextJob: 'Open next job',
  fillCurrentTab: 'Fill current tab',
  addedJobs: (n: number) => `Added ${n} job${n === 1 ? '' : 's'}.`,
  lookForPanel: 'Look for the Shortlisted panel on the page.',
  fitChip: (score: number) => `fit ${score}/10`,
  andMore: (n: number) => `…and ${n} more`,
  emptyQueue: 'No jobs queued. Add some below ↓',

  addJobsTitle: 'Add jobs',
  addJobsSummary: 'paste links, one per line',
  jobLinksLabel: 'Job links — one per line',
  addToQueue: 'Add to queue',

  checkFitTitle: 'Check my fit',
  checkFitSummary: 'paste a job, get an honest score',
  scoreMyFit: 'Score my fit',
  scoring: 'Scoring…',
  leadWith: (strengths: string) => `Lead with: ${strengths}`,
  updateProfileHint: 'Have experience these gaps miss — something not in your profile yet? Add it; scores and CVs use it right away.',
  updateProfile: 'Update profile',
  gapsHint: (gaps: string) => `Gaps (be ready for these questions): ${gaps}`,
  notShown: 'not shown',

  appliedTitle: 'Applied',
  appliedSummary: (n: number) => (n ? `${n} so far` : 'nothing yet'),
  submitsLogged: 'Submits get logged here automatically.',
  cvSent: 'CV sent:',
  pageLink: 'page',
  statusApplied: 'applied',
  statusInterviewing: 'interviewing',
  statusOffer: 'offer',
  statusRejected: 'rejected',

  fillNoTab: 'No active tab.',
  fillCannotFill: 'This page can’t be filled.',
  fillNoForm: 'No application form found on this page.',
}
