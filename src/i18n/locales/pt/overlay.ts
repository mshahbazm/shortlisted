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
  leadWithHeader: 'Destaca isto',
  gapsHeader: 'Prepara-te para perguntas sobre',
  languageNotice: (lang: string) => `Esta vaga parece estar em ${lang} — um idioma que não está no teu perfil. Mesmo assim consigo preencher o formulário.`,
  aiWorking: (n: number) => `A IA está a responder a ${n} pergunta${n === 1 ? '' : 's'}…`,
  aiFilledNote: (n: number) => `A IA preencheu ${n} — revê antes de enviar.`,
  aiFilled: 'Preenchido pela IA com os teus dados — confere. Guarda para memorizar.',
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
