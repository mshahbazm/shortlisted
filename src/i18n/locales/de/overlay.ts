import type { tLocale } from '../en'

export const overlay: tLocale['overlay'] = {
  fillApplication: 'Diese Bewerbung ausfüllen',
  fillAgain: 'Nochmal ausfüllen',
  idleNote:
    'Füllt aus, was es weiß, und fragt nach dem Rest. Du prüfst alles und klickst selbst auf Absenden.',
  filling: 'Fülle aus…',
  howDoIScore: 'Wie gut passe ich auf diesen Job?',
  scoringFit: 'Bewerte deinen Fit…',
  scoringFailed: 'Bewertung fehlgeschlagen.',
  scoringFailedRetry: 'Bewertung fehlgeschlagen — versuch es nochmal.',
  fitDenominator: '/10 Fit',
  leadWith: (strengths: string) => `Punkte mit: ${strengths}`,
  gaps: (gaps: string) => `Lücken: ${gaps}`,
  filledFields: (n: number) => `${n} ${n === 1 ? 'Feld' : 'Felder'} ausgefüllt.`,
  cvAttached: (label: string) => `Lebenslauf angehängt: ${label}`,
  attachWhichCv: 'Welchen Lebenslauf anhängen?',
  swap: 'Wechseln',
  attach: 'Anhängen',
  fromBankHeader: 'Aus deiner Antwort-Bank gefüllt — prüf das nochmal:',
  usedSimilarAnswer:
    'Ähnliche gespeicherte Antwort verwendet. Passt sie nicht, bearbeite sie auf der Seite.',
  newQuestionsHeader: 'Neue Fragen — einmal beantworten, für immer wiederverwendet:',
  skippedDemographic: (n: number) =>
    `${n} Demografie-/Umfrage-Frage(n) bleiben dir — die beantwortest du selbst von Hand.`,
  allDone: 'Alles Bekannte ist drin. Prüf die Seite und schick ab, wenn du bereit bist.',
  answerPlaceholder: 'Deine Antwort… (wird in deiner Bank gespeichert)',
  saveAndFill: 'Speichern & ausfüllen',
  saved: 'Gespeichert ✓',
}
