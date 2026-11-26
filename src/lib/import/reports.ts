// Разбор отчётов кассовой программы (PDF → строки таблицы → данные сайта).
// Строки приходят из extractRows(): каждая — массив текстов ячеек.

export type ReportInfo =
  | { kind: "sales"; store: string; from: string; to: string }
  | { kind: "stock"; store: string }
  | { kind: "unknown" };

export type ProductRow = {
  article: string;
  barcode: string;
  name: string;
  color: string;
  size: string;
  qty: number;
  cost: number;
  price: number;
};

export type PayMethod = "kaspi" | "cash" | "mixed";

export type SaleRow = {
  date: string;
  barcode: string;
  article: string;
  name: string;
  qty: number;
  sum: number;
  method: PayMethod;
  returned: boolean;
};

export type DayTotal = { date: string; kaspi: number; cash: number; mixed: number; cogs: number };

const squash = (s: string | undefined) => (s ?? "").replace(/\s+/g, "");
const clean = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const dash = (s: string) => (s === "-" ? "" : s);
const money = (s: string | undefined) => Math.round(Number(squash(s).replace(",", ".")) || 0);
const ruDate = (s: string) => {
  const m = /^(\d\d)\.(\d\d)\.(\d{4})$/.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

const STORE_RE = /(?:^|\s)(Kemel|Jaryq)(?=\s|$)/i;

function findStore(rows: string[][]): string {
  for (const r of rows.slice(0, 6)) for (const c of r) {
    const m = STORE_RE.exec(clean(c));
    if (m) return m[1];
  }
  return "";
}

export function detectReport(rows: string[][]): ReportInfo {
  const text = rows.slice(0, 6).flat().map(clean).join(" ");
  if (/Отчет по продажам/i.test(text)) {
    const m = /Период:\s*(\d\d\.\d\d\.\d{4})\s*-\s*(\d\d\.\d\d\.\d{4})/.exec(text);
    return { kind: "sales", store: findStore(rows), from: m ? ruDate(m[1])! : "", to: m ? ruDate(m[2])! : "" };
  }
  if (rows.some((r) => /^\d{6,}$/.test(squash(r[0])) && r.length === 14)) return { kind: "stock", store: findStore(rows) };
  return { kind: "unknown" };
}

export function parseStock(rows: string[][]): ProductRow[] {
  return rows
    .filter((r) => r.length === 14 && /^\d{6,}$/.test(squash(r[0])) && squash(r[1]))
    .map((r) => ({
      article: squash(r[0]),
      barcode: squash(r[1]),
      name: clean(r[3]),
      color: dash(clean(r[4])),
      size: dash(clean(r[5])),
      qty: Number(squash(r[8])) || 0,
      cost: money(r[10]),
      price: money(r[12]),
    }));
}

function method(raw: string): PayMethod {
  const m = squash(raw).toLowerCase();
  if (m.startsWith("налич")) return "cash";
  if (m.startsWith("безнал")) return "kaspi";
  return "mixed";
}

export function parseSales(rows: string[][]): SaleRow[] {
  const out: SaleRow[] = [];
  for (const r of rows) {
    if (r.length !== 18) continue;
    const date = ruDate(squash(r[0]));
    if (!date) continue;
    out.push({
      date,
      article: squash(r[2]),
      barcode: squash(r[3]),
      name: clean(r[5]),
      qty: Number(squash(r[8])) || 0,
      sum: money(r[11]),
      method: method(r[13]),
      returned: /возврат/i.test(squash(r[17])),
    });
  }
  return out;
}

/** Итоги по дням. costs: штрихкод → закупочная цена за штуку. */
export function aggregateDays(sales: SaleRow[], costs: Map<string, number>) {
  const days = new Map<string, DayTotal>();
  const unmatched = { count: 0, sum: 0 };
  const returned = { count: 0, sum: 0 };
  for (const s of sales) {
    if (s.returned) {
      returned.count++;
      returned.sum += s.sum;
      continue;
    }
    const d = days.get(s.date) ?? { date: s.date, kaspi: 0, cash: 0, mixed: 0, cogs: 0 };
    d[s.method] += s.sum;
    const cost = costs.get(s.barcode);
    if (cost === undefined) {
      unmatched.count++;
      unmatched.sum += s.sum;
    } else d.cogs += Math.round(cost * s.qty);
    days.set(s.date, d);
  }
  return { days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)), unmatched, returned };
}
