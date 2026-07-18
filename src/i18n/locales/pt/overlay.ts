import type { tLocale } from '../en'

export const overlay: tLocale['overlay'] = {
  fillApplication: 'Preencher esta candidatura',
  fillAgain: 'Preencher de novo',
  idleNote: 'Preenche o que sabe, pergunta o resto. Tu revês tudo e clicas em enviar.',
  filling: 'A preencher…',
  howDoIScore: 'Qual é o meu match para esta vaga?',
  scoringFit: 'A avaliar o teu match…',
  scoringFailed: 'A avaliação falhou.',
  scoringFailedRetry: 'A avaliação falhou — tenta de novo.',
  fitDenominator: '/10 de match',
  leadWith: (strengths: string) => `Destaca: ${strengths}`,
  gaps: (gaps: string) => `Lacunas: ${gaps}`,
  filledFields: (n: number) =>
    n === 1 ? 'Preenchi 1 campo.' : `Preenchi ${n} campos.`,
  cvAttached: (label: string) => `CV anexado: ${label}`,
  attachWhichCv: 'Anexar qual CV?',
  swap: 'Trocar',
  attach: 'Anexar',
  fromBankHeader: 'Preenchido do teu banco de respostas — confirma estas:',
  usedSimilarAnswer: 'Usei uma resposta guardada parecida. Edita na página se não encaixar.',
  newQuestionsHeader: 'Perguntas novas — responde uma vez, reutilizadas para sempre:',
  skippedDemographic: (n: number) =>
    n === 1
      ? 'Ficou 1 pergunta demográfica/de inquérito para ti — essa respondes tu à mão.'
      : `Ficaram ${n} perguntas demográficas/de inquérito para ti — essas respondes tu à mão.`,
  allDone: 'Tudo o que sei já está lá. Revê a página e envia quando estiveres pronto.',
  answerPlaceholder: 'A tua resposta… (fica guardada no teu banco)',
  saveAndFill: 'Guardar e preencher',
  saved: 'Guardado ✓',
}
