import type { tLocale } from '../en'

export const questions: tLocale['questions'] = {
  title: 'Respostas',
  hint: 'Responde uma vez, reutilizada em cada candidatura que perguntar — seja qual for a formulação.',
  fromThisJob: 'desta vaga',
  yourAnswerPlaceholder: 'A tua resposta…',
  emptyState: 'Preenche uma candidatura — cada pergunta a que não sei responder aparece aqui, uma vez.',
  timesUsed: (n: number) => `${n}×`,
}
