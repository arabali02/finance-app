import { it, expect } from "vitest";
import { mapPeriodTotals } from "./periodTotals";

it("превращает итоги из базы в данные для расчёта прибыли", () => {
  const r = mapPeriodTotals(
    {
      sales: [{ store_id: "A", kaspi: "100000", cash: 50000, terminal: 0, cogs: "60000" }],
      expenses: [{ store_id: null, category_id: "ads", amount: "10001" }],
      purchases: "7000",
      draws: 3000,
    },
    "2026-11-01",
  );
  expect(r.sales).toEqual([{ storeId: "A", date: "2026-11-01", kaspi: 100000, cash: 50000, terminal: 0, cogs: 60000 }]);
  expect(r.expenses).toEqual([{ storeId: null, date: "2026-11-01", categoryId: "ads", amount: 10001 }]);
  expect(r.purchasesTotal).toBe(7000);
  expect(r.drawsTotal).toBe(3000);
});

it("пустые итоги — нули", () => {
  const r = mapPeriodTotals({ sales: [], expenses: [], purchases: 0, draws: 0 }, "2026-11-01");
  expect(r).toEqual({ sales: [], expenses: [], purchasesTotal: 0, drawsTotal: 0 });
});
