export const TIME_ZONE = "Asia/Qyzylorda";

export function todayLocal(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function parse(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: string, n: number): string {
  const x = parse(d);
  x.setUTCDate(x.getUTCDate() + n);
  return fmt(x);
}

export function periodRange(kind: "day" | "week" | "month", ref: string): { from: string; to: string } {
  if (kind === "day") return { from: ref, to: ref };
  const d = parse(ref);
  if (kind === "week") {
    const dow = (d.getUTCDay() + 6) % 7; // 0 = понедельник
    const from = addDays(ref, -dow);
    return { from, to: addDays(from, 6) };
  }
  const from = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const to = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return { from: fmt(from), to: fmt(to) };
}
