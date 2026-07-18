import type { tLocale } from '../en'

export const apply: tLocale['apply'] = {
  inQueue: 'en cola',
  applied: 'postulados',
  openNextJob: 'Abrir siguiente empleo',
  fillCurrentTab: 'Rellenar pestaña actual',
  addedJobs: (n: number) => (n === 1 ? 'Se añadió 1 empleo.' : `Se añadieron ${n} empleos.`),
  permissionDeclined:
    'Permiso denegado — el autorrellenado sigue funcionando en los sitios de empleo conocidos.',
  lookForPanel: 'Busca el panel de Shortlisted en la página.',
  fitChip: (score: number) => `encaje ${score}/10`,
  andMore: (n: number) => `…y ${n} más`,
  emptyQueue: 'No hay empleos en cola. Añade algunos abajo ↓',

  addJobsTitle: 'Añadir empleos',
  addJobsSummary: 'pega enlaces, uno por línea',
  jobLinksLabel: 'Enlaces de empleos — uno por línea',
  addToQueue: 'Añadir a la cola',
  checkFitTitle: 'Ver mi encaje',
  checkFitSummary: 'pega una oferta, recibe una puntuación honesta',
  scoreMyFit: 'Puntuar mi encaje',
  scoring: 'Puntuando…',
  leadWith: (strengths: string) => `Destaca: ${strengths}`,
  gapsHint: (gaps: string) => `Carencias (prepárate para estas preguntas): ${gaps}`,
  notShown: 'no se muestra',

  appliedTitle: 'Postulaciones',
  appliedSummary: (n: number) => (n ? `${n} hasta ahora` : 'ninguna aún'),
  submitsLogged: 'Los envíos se registran aquí solos.',
  pageLink: 'página',
  statusApplied: 'postulado',
  statusInterviewing: 'en entrevistas',
  statusOffer: 'oferta',
  statusRejected: 'rechazado',
}
