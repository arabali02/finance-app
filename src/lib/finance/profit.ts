import type { DaySale, Expense, ProfitTotals, Store, StoreProfit } from "./types";

export function computeProfit(input: {
  stores: Store[];
  sales: DaySale[];
  expenses: Expense[];
  taxRate: number;
}): { byStore: StoreProfit[]; total: ProfitTotals } {
  const stores = [...input.stores].sort((a, b) => a.sortOrder - b.sortOrder);
  const acc = new Map<string, { revenue: number; cogs: number; opex: number }>();
  for (const s of stores) acc.set(s.id, { revenue: 0, cogs: 0, opex: 0 });

  for (const sale of input.sales) {
    const a = acc.get(sale.storeId);
    if (!a) continue;
    a.revenue += sale.kaspi + sale.cash + sale.terminal + (sale.mixed ?? 0);
    a.cogs += sale.cogs;
  }

  let shared = 0;
  for (const e of input.expenses) {
    if (e.storeId === null) shared += e.amount;
    else {
      const a = acc.get(e.storeId);
      if (a) a.opex += e.amount;
    }
  }
  if (stores.length > 0 && shared > 0) {
    const part = Math.floor(shared / stores.length);
    const rest = shared - part * stores.length;
    stores.forEach((s, i) => {
      acc.get(s.id)!.opex += part + (i === 0 ? rest : 0);
    });
  }

  const byStore: StoreProfit[] = stores.map((s) => {
    const a = acc.get(s.id)!;
    const tax = Math.round(a.revenue * input.taxRate);
    return { storeId: s.id, ...a, tax, net: a.revenue - a.cogs - a.opex - tax };
  });

  const total: ProfitTotals = { revenue: 0, cogs: 0, opex: 0, tax: 0, net: 0 };
  for (const p of byStore) {
    total.revenue += p.revenue;
    total.cogs += p.cogs;
    total.opex += p.opex;
    total.tax += p.tax;
    total.net += p.net;
  }
  return { byStore, total };
}

export function expensesByCategory(expenses: Expense[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of expenses) out[e.categoryId] = (out[e.categoryId] ?? 0) + e.amount;
  return out;
}
