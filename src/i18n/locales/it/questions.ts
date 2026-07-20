import type { tLocale } from '../en'

export const questions: tLocale['questions'] = {
  title: 'Cosa so di te',
  hint:
    'Tutto ciò che mi hai insegnato — riusato in ogni candidatura che lo chiede, con qualsiasi formulazione. Sistemo la forma; i fatti restano i tuoi.',
  askedAs: (q: string) => `Chiesto come: “${q}”`,
  fromThisJob: 'da questa offerta',
  yourAnswerPlaceholder: 'La tua risposta…',
  emptyState: 'Compila una candidatura — ogni domanda a cui non so rispondere finisce qui, una volta sola.',
  timesUsed: (n: number) => `${n}×`,
  noPending: 'Niente in sospeso. Le domande di un modulo a cui non so rispondere finiscono qui.',
  pendingLede: 'Rispondi una volta. Riuso la risposta su qualsiasi modulo chieda la stessa cosa.',
}
