// The Profile tab: identity, links, work, education, extras, standard answers.

export const profile = {
  hint: 'Everything the extension fills comes from here.',

  city: 'City',
  headline: 'Headline',
  summary: 'Summary',
  skills: 'Skills',
  industries: 'Industries',

  website: 'Website',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  portfolio: 'Portfolio',

  company: 'Company',
  workHighlights: 'Highlights — one per line, real and concrete',

  degree: 'Degree',
  fieldOfStudy: 'Field of study',
  school: 'School',

  salaryHourly: 'Hourly rate',
  salaryMonthly: 'Monthly rate',
  noticeDays: 'Notice (days)',
  noticeDaysHint: '0 = available immediately',
  yearsOfExperience: 'Years of experience',
  timezone: 'Timezone',
  relocation: 'Relocation',
  hoursOverlap: 'Hours overlap',
  englishLevel: 'English level',

  tellMeFinishJob: (company: string) =>
    `Add the title and dates for ${company} so a tailored CV doesn't show a gap.`,
  workNeedsDetail:
    'Needs a job title and start date — a tailored CV reads this as a gap.',
  tellMeNoSuchJob:
    'I couldn\'t attach that to a job — add the job under Work first, then tell me about it.',
  uploadPdf: 'Upload PDF',
  reading: 'Reading…',
  answerBankTitle: 'Answer bank',
  reimportMergeReviewBody: (count: number) =>
    `Found ${count} new item${count === 1 ? '' : 's'} in this CV. Remove anything you don’t want, then add the rest.`,
  sex: 'Sex',
  drivingLicence: 'Driving licence',
  additionalInfo: 'Additional information',
  communicationSkills: 'Communication skills',
  organisationalSkills: 'Organisational skills',
  digitalSkills: 'Digital skills',
  jobType: 'Job type',
  oneCredit: '1 credit',
  segUnanswered: 'Unanswered',
  photo: "Photo",
  manageProfileOnWeb: 'Edit your profile on the web →',
}
