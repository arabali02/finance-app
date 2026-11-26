import { createServerClient } from "@/lib/supabase/server";
import { getStores, getTaxRate } from "./refs";
import type { DaySale, Expense, Store } from "@/lib/finance/types";

export type PeriodData = {
  stores: Store[];
  sales: DaySale[];
  expenses: Expense[];
  purchasesTotal: number;
  drawsTotal: number;
  taxRate: number;
};

const sum = (rows: { amount: number }[] | null) => (rows ?? []).reduce((a, r) => a + Number(r.amount), 0);

export async function loadPeriod(from: string, to: string): Promise<PeriodData> {
  const sb = await createServerClient();
  const [stores, taxRate, sales, expenses, purchases, draws] = await Promise.all([
    getStores(),
    getTaxRate(),
    sb.from("day_sales").select("store_id,date,kaspi,cash,terminal,cogs").gte("date", from).lte("date", to),
    sb.from("expenses").select("store_id,date,category_id,amount").gte("date", from).lte("date", to),
    sb.from("purchases").select("amount").gte("date", from).lte("date", to),
    sb.from("owner_draws").select("amount").gte("date", from).lte("date", to),
  ]);
  for (const r of [sales, expenses, purchases, draws]) if (r.error) throw r.error;
  return {
    stores,
    taxRate,
    sales: (sales.data ?? []).map((s) => ({
      storeId: s.store_id,
      date: s.date,
      kaspi: Number(s.kaspi),
      cash: Number(s.cash),
      terminal: Number(s.terminal),
      cogs: Number(s.cogs),
    })),
    expenses: (expenses.data ?? []).map((e) => ({
      storeId: e.store_id,
      date: e.date,
      categoryId: e.category_id,
      amount: Number(e.amount),
    })),
    purchasesTotal: sum(purchases.data),
    drawsTotal: sum(draws.data),
  };
}
