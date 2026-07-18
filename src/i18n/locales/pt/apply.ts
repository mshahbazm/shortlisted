import type { tLocale } from '../en'

export const apply: tLocale['apply'] = {
  inQueue: 'na fila',
  applied: 'enviadas',
  openNextJob: 'Abrir próxima vaga',
  fillCurrentTab: 'Preencher separador atual',
  addedJobs: (n: number) => (n === 1 ? 'Adicionada 1 vaga.' : `Adicionadas ${n} vagas.`),
  permissionDeclined:
    'Permissão recusada — o preenchimento automático continua a funcionar nos sites de emprego conhecidos.',
  lookForPanel: 'Procura o painel do Shortlisted na página.',
  fitChip: (score: number) => `match ${score}/10`,
  andMore: (n: number) => `…e mais ${n}`,
  emptyQueue: 'Sem vagas na fila. Adiciona algumas abaixo ↓',

  addJobsTitle: 'Adicionar vagas',
  addJobsSummary: 'cola links, um por linha',
  jobLinksLabel: 'Links de vagas — um por linha',
  addToQueue: 'Adicionar à fila',
  checkFitTitle: 'Ver o meu match',
  checkFitSummary: 'cola uma vaga, recebe uma nota honesta',
  scoreMyFit: 'Avaliar o meu match',
  scoring: 'A avaliar…',
  leadWith: (strengths: string) => `Destaca: ${strengths}`,
  gapsHint: (gaps: string) => `Lacunas (prepara-te para estas perguntas): ${gaps}`,
  notShown: 'não mostrado',

  appliedTitle: 'Candidaturas',
  appliedSummary: (n: number) => (n ? `${n} até agora` : 'ainda nenhuma'),
  submitsLogged: 'Os envios ficam registados aqui automaticamente.',
  pageLink: 'página',
  statusApplied: 'enviada',
  statusInterviewing: 'em entrevista',
  statusOffer: 'oferta',
  statusRejected: 'rejeitada',
}
