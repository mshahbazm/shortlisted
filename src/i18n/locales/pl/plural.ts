// Polish plural picker: 1 → one, 2-4 (except 12-14) → few, everything else → many.
export const plural = (n: number, one: string, few: string, many: string) => {
  if (n === 1) return one
  const m10 = n % 10
  const m100 = n % 100
  return m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many
}
