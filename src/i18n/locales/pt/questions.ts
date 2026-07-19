import type { tLocale } from '../en'

export const questions: tLocale['questions'] = {
  title: 'O que sei sobre ti',
  hint:
    'Tudo o que me ensinaste — reutilizado em cada candidatura que o pedir, em qualquer formulação. Aperfeiçoo a redação; os factos continuam teus.',
  askedAs: (q: string) => `Perguntado como: “${q}”`,
  fromThisJob: 'desta vaga',
  yourAnswerPlaceholder: 'A tua resposta…',
  emptyState: 'Preenche uma candidatura — cada pergunta a que não sei responder aparece aqui, uma vez.',
  timesUsed: (n: number) => `${n}×`,
}
