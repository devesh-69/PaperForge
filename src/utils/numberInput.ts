/** Keeps only digits and a single decimal point (for marks fields). */
export function sanitizeMarks(v: string): string {
  const cleaned = v.replace(/[^0-9.]/g, '');
  const i = cleaned.indexOf('.');
  return i === -1 ? cleaned : cleaned.slice(0, i + 1) + cleaned.slice(i + 1).replace(/\./g, '');
}
