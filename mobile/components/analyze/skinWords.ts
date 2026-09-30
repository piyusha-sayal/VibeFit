/** Skin evenness as a description, never a number out of 100. */
export function evennessWord(evenness: number): string {
  if (evenness >= 70) return 'Even';
  if (evenness >= 45) return 'Mostly even';
  return 'Varied';
}
