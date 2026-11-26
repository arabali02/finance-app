import Link from "next/link";
import { Money } from "@/components/Money";
import { CategoryChart, StoreProfitChart } from "./Charts";
import { ExcelButton } from "./ExcelButton";
import { loadPeriod } from "@/lib/data/loadPeriod";
import { getCategories } from "@/lib/data/refs";
import { computeProfit, expensesByCategory } from "@/lib/finance/profit";
import { periodRange, todayLocal } from "@/lib/finance/dates";

type P = "day" | "week" | "month" | "custom";
const LABELS: Record<P, string> = { day: "День", week: "Неделя", month: "Месяц", custom: "Период" };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ p?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const p: P = (["day", "week", "month", "custom"] as const).includes(sp.p as P) ? (sp.p as P) : "month";
  const today = todayLocal();
  let { from, to } = periodRange(p === "custom" ? "month" : p, today);
  if (p === "custom" && DATE_RE.test(sp.from ?? "") && DATE_RE.test(sp.to ?? "")) {
    from = sp.from!;
    to = sp.to!;
    if (from > to) [from, to] = [to, from];
  }

  const [data, cats] = await Promise.all([loadPeriod(from, to), getCategories("business")]);
  const profit = computeProfit(data);
  const storeNames = Object.fromEntries(data.stores.map((s) => [s.id, s.name]));
  const byCategory = Object.entries(expensesByCategory(data.expenses))
    .map(([id, amount]) => ({ name: cats.find((c) => c.id === id)?.name ?? "—", amount }))
    .sort((a, b) => b.amount - a.amount);

  const rows: [string, keyof typeof profit.total, number][] = [
    ["Выручка", "revenue", 1],
    ["Себестоимость", "cogs", -1],
    ["Расходы", "opex", -1],
    ["Налог", "tax", -1],
    ["Чистая прибыль", "net", 1],
  ];
  const chip = (active: boolean) => `rounded-full border px-3 py-1.5 text-sm ${active ? "border-accent bg-accent text-accent-text" : "border-border bg-surface"}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Отчёты</h1>
        <ExcelButton data={{ period: { from, to }, profit, byCategory, storeNames }} />
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(LABELS) as P[]).map((k) => (
          <Link key={k} href={`/reports?p=${k}`} className={chip(p === k)}>{LABELS[k]}</Link>
        ))}
      </div>
      {p === "custom" && (
        <form className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="p" value="custom" />
          <label className="space-y-1 text-sm"><span className="text-muted">С</span><input type="date" name="from" defaultValue={from} className="field py-2" /></label>
          <label className="space-y-1 text-sm"><span className="text-muted">По</span><input type="date" name="to" defaultValue={to} className="field py-2" /></label>
          <button className="btn-primary py-2">Показать</button>
        </form>
      )}
      <p className="text-sm text-muted">{from.split("-").reverse().join(".")} — {to.split("-").reverse().join(".")}</p>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="p-3 font-medium">Показатель</th>
              {profit.byStore.map((s) => <th key={s.storeId} className="p-3 text-right font-medium">{storeNames[s.storeId]}</th>)}
              <th className="p-3 text-right font-medium">Итого</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, key, sign]) => {
              const net = key === "net";
              return (
                <tr key={key} className={net ? "border-t border-border font-bold" : ""}>
                  <td className="p-3">{label}</td>
                  {profit.byStore.map((s) => <td key={s.storeId} className="p-3 text-right"><Money value={s[key] * sign} signed={net} /></td>)}
                  <td className="p-3 text-right"><Money value={profit.total[key] * sign} signed={net} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <StoreProfitChart data={profit.byStore.map((s) => ({ name: storeNames[s.storeId], net: s.net }))} />
      <CategoryChart data={byCategory} />
      {byCategory.length === 0 && <p className="card text-muted">Расходов за период нет.</p>}
      <p className="text-xs text-muted">
        Общие расходы делятся между магазинами поровну. Налог — {Math.round(data.taxRate * 1000) / 10}% от выручки.
        Закуплено товара за период: <Money value={data.purchasesTotal} /> (не входит в прибыль).
      </p>
    </div>
  );
}
