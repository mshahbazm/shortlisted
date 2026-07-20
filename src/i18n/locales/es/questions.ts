import type { tLocale } from '../en'

export const questions: tLocale['questions'] = {
  title: 'Lo que sé de ti',
  hint:
    'Todo lo que me has enseñado — reutilizado en cada solicitud que lo pida, con cualquier redacción. Pulo la redacción; los datos siguen siendo tuyos.',
  askedAs: (q: string) => `Preguntado como: «${q}»`,
  fromThisJob: 'de este empleo',
  yourAnswerPlaceholder: 'Tu respuesta…',
  emptyState: 'Rellena una solicitud — cada pregunta que no sepa responder cae aquí, una sola vez.',
  timesUsed: (n: number) => `${n}×`,
  noPending: 'Nada pendiente. Las preguntas de un formulario que no sé contestar llegan aquí.',
  pendingLede: 'Contesta una vez. Lo reutilizo en cualquier formulario que pregunte lo mismo.',
}
