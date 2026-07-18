import type { tLocale } from '../en'

export const overlay: tLocale['overlay'] = {
  fillApplication: 'Vul deze sollicitatie in',
  fillAgain: 'Opnieuw invullen',
  idleNote: 'Vult in wat het weet, vraagt naar de rest. Jij controleert alles en klikt zelf op versturen.',
  filling: 'Invullen…',
  howDoIScore: 'Hoe scoor ik voor deze vacature?',
  scoringFit: 'Je match wordt beoordeeld…',
  scoringFailed: 'Beoordelen mislukt.',
  scoringFailedRetry: 'Beoordelen mislukt — probeer opnieuw.',
  fitDenominator: '/10 match',
  leadWithHeader: 'Zet dit voorop',
  gapsHeader: 'Reken op vragen over',
  filledFields: (n: number) => (n === 1 ? '1 veld ingevuld.' : `${n} velden ingevuld.`),
  cvAttached: (label: string) => `Cv bijgevoegd: ${label}`,
  attachWhichCv: 'Welk cv bijvoegen?',
  swap: 'Wisselen',
  attach: 'Bijvoegen',
  fromBankHeader: 'Ingevuld uit je antwoordenbank — check deze even:',
  usedSimilarAnswer: 'Een vergelijkbaar opgeslagen antwoord gebruikt. Pas het op de pagina aan als het niet klopt.',
  newQuestionsHeader: 'Nieuwe vragen — één keer beantwoorden, voor altijd hergebruikt:',
  skippedDemographic: (n: number) =>
    n === 1
      ? '1 demografische/enquêtevraag voor jou overgelaten — die beantwoord je zelf.'
      : `${n} demografische/enquêtevragen voor jou overgelaten — die beantwoord je zelf.`,
  allDone: 'Alles wat het weet, staat erin. Bekijk de pagina en verstuur wanneer je klaar bent.',
  answerPlaceholder: 'Jouw antwoord… (opgeslagen in je bank)',
  saveAndFill: 'Opslaan & invullen',
  saved: 'Opgeslagen ✓',
}
