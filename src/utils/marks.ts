// Marking-scheme helpers.
//
// Negative marks are always stored as a deduction (zero or below), whichever
// way the author types them: 0.25 and -0.25 both become -0.25. They can never
// take away more than a question awards.

/** 0.75 / -0.75 -> -0.75; 0 stays 0 (never -0); NaN is passed through for validation to report. */
export function toNegativeMarks(n: number): number {
  if (!Number.isFinite(n)) return n;
  return n === 0 ? 0 : -Math.abs(n);
}

/** Message when the deduction is larger than the marks for a correct answer, else null. */
export function negativeMarksTooLarge(correct: number, negative: number): string | null {
  if (!Number.isFinite(correct) || !Number.isFinite(negative)) return null;
  if (Math.abs(negative) <= correct) return null;
  return `Negative Marks (${Math.abs(negative)}) cannot be more than Correct Marks (${correct})`;
}
