import type { tLocale } from '../en'

export const questions: tLocale['questions'] = {
  title: 'Respuestas',
  hint: 'Responde una vez y se reutiliza en cada solicitud que la pida — con cualquier redacción.',
  fromThisJob: 'de este empleo',
  yourAnswerPlaceholder: 'Tu respuesta…',
  emptyState: 'Rellena una solicitud — cada pregunta que no sepa responder cae aquí, una sola vez.',
  timesUsed: (n: number) => `${n}×`,
}
