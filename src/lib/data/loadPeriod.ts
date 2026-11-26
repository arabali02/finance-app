import { createServerClient } from "@/lib/supabase/server";
import { getStores, getTaxRate } from "./refs";
import { mapPeriodTotals, type PeriodTotalsJson } from "./periodTotals";
import type { DaySale, Expense, Store } from "@/lib/finance/types";

export type PeriodData = {
  stores: Store[];
  sales: DaySale[];
  expenses: Expense[];
  purchasesTotal: number;
  drawsTotal: number;
  taxRate: number;
};

export async function loadPeriod(from: string, to: string): Promise<PeriodData> {
  const sb = await createServerClient();
  const [stores, taxRate, totals] = await Promise.all([
    getStores(),
    getTaxRate(),
    sb.rpc("period_totals", { p_from: from, p_to: to }),
  ]);
  if (totals.error) throw totals.error;
  return { stores, taxRate, ...mapPeriodTotals(totals.data as PeriodTotalsJson, from) };
}
