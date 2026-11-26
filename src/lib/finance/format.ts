const NBSP = " ";

export function formatTenge(n: number): string {
  const abs = Math.abs(Math.round(n));
  const digits = String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${n < 0 ? "−" : ""}${digits}${NBSP}₸`;
}
