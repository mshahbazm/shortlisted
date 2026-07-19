import { BankAnswer } from './types'

// Normalize a question so different phrasings land on the same key.
export function normalizeQuestion(raw: string): string {
  return (
    raw
      .toLowerCase()
      .replace(/\(.*?\)/g, ' ') // drop parentheticals like "(optional)"
      .replace(/[*:?!.,"'’]/g, ' ')
      .replace(/\bwanna\b/g, 'want to')
      .replace(/\bwhy\s+us\b/g, 'why work here')
      // "work at Acme" / "work for Acme" / "join Acme" / "join us" / "work with us"
      // are all the same question — the company name is noise for matching.
      .replace(/\b(work\s+(at|for|with)|join)\s+[\w .&'-]+/g, 'work here')
      .replace(/\bwork\s+here\b[\w .&'-]*/g, 'work here')
      .replace(/\bwhy\s+(want\s+to\s+)?work here\b/g, 'why want to work here')
      .replace(/\b(expected|desired)\s+(salary|compensation|pay|rate)\b/g, 'salary expectation')
      .replace(/\b(salary|compensation|pay)\s+expectations?\b/g, 'salary expectation')
      .replace(
        /\b(please|kindly|briefly|optional|required|the|a|an|your|you|are|do|does|is|if any|what|describe|tell (us|me) about)\b/g,
        ' ',
      )
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function bigrams(s: string): Set<string> {
  const out = new Set<string>()
  const clean = s.replace(/\s+/g, ' ')
  for (let i = 0; i < clean.length - 1; i++) out.add(clean.slice(i, i + 2))
  return out
}

// Sørensen–Dice similarity on character bigrams. 0..1.
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  const A = bigrams(a)
  const B = bigrams(b)
  if (A.size === 0 || B.size === 0) return 0
  let inter = 0
  for (const g of A) if (B.has(g)) inter++
  return (2 * inter) / (A.size + B.size)
}

export interface BankMatch {
  answer: BankAnswer
  score: number
  exact: boolean
}

const MATCH_THRESHOLD = 0.82

export function matchQuestion(raw: string, bank: BankAnswer[]): BankMatch | null {
  const norm = normalizeQuestion(raw)
  if (!norm) return null
  let best: BankMatch | null = null
  for (const a of bank) {
    // Every recorded phrasing counts — fill-assist appends the phrasings it
    // recognizes, so the free matcher keeps learning from the AI's matches.
    const norms = new Set([a.questionNorm, ...a.questionRaw.map(normalizeQuestion)])
    for (const n of norms) {
      if (!n) continue
      if (n === norm) return { answer: a, score: 1, exact: true }
      const score = similarity(norm, n)
      if (score >= MATCH_THRESHOLD && (!best || score > best.score)) {
        best = { answer: a, score, exact: false }
      }
    }
  }
  return best
}
