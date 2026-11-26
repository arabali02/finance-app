import type { DaySale, Expense } from "@/lib/finance/types";

type Num = number | string;
export type PeriodTotalsJson = {
  sales: { store_id: string; kaspi: Num; cash: Num; terminal: Num; cogs: Num }[];
  expenses: { store_id: string | null; category_id: string; amount: Num }[];
  purchases: Num;
  draws: Num;
};

/** Итоги из period_totals() → строки для computeProfit (по одной на магазин/категорию). */
export function mapPeriodTotals(j: PeriodTotalsJson, from: string) {
  const sales: DaySale[] = j.sales.map((s) => ({
    storeId: s.store_id,
    date: from,
    kaspi: Number(s.kaspi),
    cash: Number(s.cash),
    terminal: Number(s.terminal),
    cogs: Number(s.cogs),
  }));
  const expenses: Expense[] = j.expenses.map((e) => ({
    storeId: e.store_id,
    date: from,
    categoryId: e.category_id,
    amount: Number(e.amount),
  }));
  return { sales, expenses, purchasesTotal: Number(j.purchases), drawsTotal: Number(j.draws) };
}
