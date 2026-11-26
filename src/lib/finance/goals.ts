export function goalProgress(saved: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.floor((saved / target) * 100)));
}
