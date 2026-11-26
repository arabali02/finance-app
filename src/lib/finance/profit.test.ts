import { describe, it, expect } from "vitest";
import { computeProfit, expensesByCategory } from "./profit";
import type { Store } from "./types";

const stores: Store[] = [
  { id: "A", name: "KEMEL", sortOrder: 0 },
  { id: "B", name: "JARYQ", sortOrder: 1 },
];

describe("computeProfit", () => {
  it("считает чистую прибыль по магазинам с общим расходом", () => {
    const r = computeProfit({
      stores,
      sales: [{ storeId: "A", date: "2026-11-26", kaspi: 100000, cash: 50000, terminal: 0, cogs: 60000 }],
      expenses: [
        { storeId: "A", date: "2026-11-26", categoryId: "rent", amount: 20000 },
        { storeId: null, date: "2026-11-26", categoryId: "ads", amount: 10001 },
      ],
      taxRate: 0.02,
    });
    const a = r.byStore.find((s) => s.storeId === "A")!;
    const b = r.byStore.find((s) => s.storeId === "B")!;
    expect(a).toEqual({ storeId: "A", revenue: 150000, cogs: 60000, opex: 25001, tax: 3000, net: 61999 });
    expect(b).toEqual({ storeId: "B", revenue: 0, cogs: 0, opex: 5000, tax: 0, net: -5000 });
    expect(r.total).toEqual({ revenue: 150000, cogs: 60000, opex: 30001, tax: 3000, net: 56999 });
  });

  it("себестоимость больше выручки даёт отрицательную прибыль", () => {
    const r = computeProfit({
      stores,
      sales: [{ storeId: "A", date: "2026-11-26", kaspi: 150000, cash: 0, terminal: 0, cogs: 200000 }],
      expenses: [],
      taxRate: 0.02,
    });
    expect(r.byStore[0].net).toBe(150000 - 200000 - 3000);
    expect(r.total.net).toBe(-53000);
  });

  it("пустой период — нули, без NaN", () => {
    const r = computeProfit({ stores, sales: [], expenses: [], taxRate: 0.02 });
    expect(r.total).toEqual({ revenue: 0, cogs: 0, opex: 0, tax: 0, net: 0 });
    for (const s of r.byStore) for (const v of Object.values(s)) expect(Number.isNaN(v)).toBe(false);
  });
});

describe("expensesByCategory", () => {
  it("суммирует по категориям", () => {
    expect(
      expensesByCategory([
        { storeId: "A", date: "2026-11-01", categoryId: "rent", amount: 100 },
        { storeId: null, date: "2026-11-02", categoryId: "rent", amount: 50 },
        { storeId: "B", date: "2026-11-02", categoryId: "ads", amount: 7 },
      ]),
    ).toEqual({ rent: 150, ads: 7 });
  });
});
