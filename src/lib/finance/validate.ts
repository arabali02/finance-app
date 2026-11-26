export type ParseResult = { ok: true; value: number } | { ok: false; error: string };

const MAX = 1_000_000_000_000; // 1 трлн ₸ — защита от опечаток

export function parseAmount(raw: string, opts: { allowZero?: boolean } = {}): ParseResult {
  const allowZero = opts.allowZero ?? false;
  const error = allowZero ? "Введите сумму 0 или больше" : "Введите сумму больше нуля";
  const s = raw.replace(/[\s ]/g, "");
  if (s === "") return allowZero ? { ok: true, value: 0 } : { ok: false, error };
  if (!/^\d+$/.test(s)) return { ok: false, error };
  const value = Number(s);
  if (value > MAX) return { ok: false, error: "Слишком большая сумма" };
  if (value === 0 && !allowZero) return { ok: false, error };
  return { ok: true, value };
}
