// The Answers tab: pending questions + the answer bank.

export const questions = {
  title: 'What I know about you',
  hint:
    'Everything you\'ve taught me — reused on any application that asks, in any phrasing. I tidy the wording; the facts stay yours.',
  askedAs: (q: string) => `Asked as: “${q}”`,
  fromThisJob: 'from this job',
  yourAnswerPlaceholder: 'Your answer…',
  emptyState: "Fill an application — every question I can't answer lands here, once.",
  timesUsed: (n: number) => `${n}×`,
}
