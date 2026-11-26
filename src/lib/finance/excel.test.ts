import { it, expect } from "vitest";
import ExcelJS from "exceljs";
import { buildReportWorkbook } from "./excel";
import { computeProfit } from "./profit";

it("книга: листы и итоговая чистая прибыль", async () => {
  const profit = computeProfit({
    stores: [
      { id: "A", name: "KEMEL", sortOrder: 0 },
      { id: "B", name: "JARYQ", sortOrder: 1 },
    ],
    sales: [{ storeId: "A", date: "2026-11-26", kaspi: 100000, cash: 50000, terminal: 0, cogs: 60000 }],
    expenses: [{ storeId: null, date: "2026-11-26", categoryId: "ads", amount: 10001 }],
    taxRate: 0.02,
  });
  const wb = buildReportWorkbook({
    period: { from: "2026-11-01", to: "2026-11-30" },
    profit,
    byCategory: [{ name: "Реклама", amount: 10001 }],
    storeNames: { A: "KEMEL", B: "JARYQ" },
  });
  // сериализация и обратное чтение — проверяем реальный файл
  const buf = await wb.xlsx.writeBuffer();
  const back = new ExcelJS.Workbook();
  await back.xlsx.load(buf);
  expect(back.worksheets.map((w) => w.name)).toEqual(["Прибыль", "Расходы по категориям"]);
  const ws = back.getWorksheet("Прибыль")!;
  const header = (ws.getRow(3).values as unknown[]).slice(1);
  expect(header).toEqual(["Показатель", "KEMEL", "JARYQ", "Итого"]);
  let netRow: ExcelJS.Row | undefined;
  ws.eachRow((r) => { if (r.getCell(1).value === "Чистая прибыль") netRow = r; });
  expect(netRow!.getCell(4).value).toBe(profit.total.net);
  expect(back.getWorksheet("Расходы по категориям")!.getRow(2).getCell(2).value).toBe(10001);
});
