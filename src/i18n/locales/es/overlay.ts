import type { tLocale } from '../en'

export const overlay: tLocale['overlay'] = {
  fillApplication: 'Rellenar esta solicitud',
  fillAgain: 'Rellenar de nuevo',
  idleNote: 'Rellena lo que sabe y pregunta el resto. Tú lo revisas todo y haces clic en enviar.',
  filling: 'Rellenando…',
  howDoIScore: '¿Cómo encajo en este empleo?',
  scoringFit: 'Calculando tu encaje…',
  scoringFailed: 'No se pudo puntuar.',
  scoringFailedRetry: 'No se pudo puntuar — inténtalo de nuevo.',
  fitDenominator: '/10 de encaje',
  leadWith: (strengths: string) => `Destaca: ${strengths}`,
  gaps: (gaps: string) => `Carencias: ${gaps}`,
  filledFields: (n: number) => `Rellené ${n} campo${n === 1 ? '' : 's'}.`,
  cvAttached: (label: string) => `CV adjunto: ${label}`,
  attachWhichCv: '¿Qué CV adjuntar?',
  swap: 'Cambiar',
  attach: 'Adjuntar',
  fromBankHeader: 'Rellenado desde tu banco de respuestas — revisa esto:',
  usedSimilarAnswer: 'Usé una respuesta guardada parecida. Edítala en la página si no encaja.',
  newQuestionsHeader: 'Preguntas nuevas — responde una vez, se reutilizan siempre:',
  skippedDemographic: (n: number) =>
    `Te quedan ${n} pregunta(s) demográficas o de encuesta — esas se responden a mano.`,
  allDone: 'Todo lo que sabe ya está puesto. Revisa la página y envía cuando estés listo.',
  answerPlaceholder: 'Tu respuesta… (se guarda en tu banco)',
  saveAndFill: 'Guardar y rellenar',
  saved: 'Guardado ✓',
}
