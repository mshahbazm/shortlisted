import type { tLocale } from '../en'

export const questions: tLocale['questions'] = {
  title: 'Risposte',
  hint: 'Rispondi una volta, riusata in ogni candidatura che la chiede — comunque sia formulata.',
  fromThisJob: 'da questa offerta',
  yourAnswerPlaceholder: 'La tua risposta…',
  emptyState: 'Compila una candidatura — ogni domanda a cui non so rispondere finisce qui, una volta sola.',
  timesUsed: (n: number) => `${n}×`,
}
