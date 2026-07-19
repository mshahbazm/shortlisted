import type { tLocale } from '../en'
import { plural } from './plural'

export const apply: tLocale['apply'] = {
  inQueue: 'w kolejce',
  applied: 'wysłane',
  openNextJob: 'Otwórz następną ofertę',
  fillCurrentTab: 'Wypełnij bieżącą kartę',
  addedJobs: (n: number) => `Dodano ${n} ${plural(n, 'ofertę', 'oferty', 'ofert')}.`,
  permissionDeclined:
    'Uprawnienia odrzucone — autouzupełnianie nadal działa na znanych portalach pracy.',
  lookForPanel: 'Poszukaj panelu Shortlisted na stronie.',
  fitChip: (score: number) => `dopasowanie ${score}/10`,
  andMore: (n: number) => `…i jeszcze ${n}`,
  emptyQueue: 'Brak ofert w kolejce. Dodaj poniżej ↓',

  addJobsTitle: 'Dodaj oferty',
  addJobsSummary: 'wklej linki, po jednym w wierszu',
  jobLinksLabel: 'Linki do ofert — jeden na linię',
  addToQueue: 'Dodaj do kolejki',
  checkFitTitle: 'Sprawdź moje dopasowanie',
  checkFitSummary: 'wklej ofertę, dostań szczerą ocenę',
  scoreMyFit: 'Oceń moje dopasowanie',
  scoring: 'Oceniam…',
  leadWith: (strengths: string) => `Podkreśl: ${strengths}`,
  updateProfileHint: 'Masz doświadczenie, którego te braki nie widzą — coś, czego nie ma jeszcze w profilu? Dodaj je; oceny i CV użyją go od razu.',
  updateProfile: 'Zaktualizuj profil',
  gapsHint: (gaps: string) => `Braki (przygotuj się na te pytania): ${gaps}`,
  notShown: 'nie pokazano',

  appliedTitle: 'Wysłane',
  appliedSummary: (n: number) => (n ? `już ${n}` : 'jeszcze nic'),
  submitsLogged: 'Wysłane aplikacje zapisują się tu automatycznie.',
  pageLink: 'strona',
  statusApplied: 'wysłana',
  statusInterviewing: 'rozmowy',
  statusOffer: 'oferta',
  statusRejected: 'odrzucona',
}
