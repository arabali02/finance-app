import ExcelJS from "exceljs";
import type { computeProfit } from "./profit";

export type ReportData = {
  period: { from: string; to: string };
  profit: ReturnType<typeof computeProfit>;
  byCategory: { name: string; amount: number }[];
  storeNames: Record<string, string>;
};

const MONEY = '#,##0 "₸";[Red]-#,##0 "₸"';
const ru = (d: string) => d.split("-").reverse().join(".");

export function buildReportWorkbook(data: ReportData): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  const { byStore, total } = data.profit;

  const ws = wb.addWorksheet("Прибыль");
  ws.addRow([`Отчёт за ${ru(data.period.from)} — ${ru(data.period.to)}`]).font = { bold: true, size: 14 };
  ws.addRow([]);
  ws.addRow(["Показатель", ...byStore.map((s) => data.storeNames[s.storeId] ?? s.storeId), "Итого"]).font = { bold: true };
  const lines: [string, keyof typeof total, number][] = [
    ["Выручка", "revenue", 1],
    ["Себестоимость", "cogs", -1],
    ["Расходы", "opex", -1],
    ["Налог", "tax", -1],
    ["Чистая прибыль", "net", 1],
  ];
  for (const [label, key, sign] of lines) {
    const row = ws.addRow([label, ...byStore.map((s) => s[key] * sign), total[key] * sign]);
    if (key === "net") row.font = { bold: true };
  }
  ws.getColumn(1).width = 20;
  for (let c = 2; c <= byStore.length + 2; c++) {
    ws.getColumn(c).width = 16;
    ws.getColumn(c).numFmt = MONEY;
  }

  const wc = wb.addWorksheet("Расходы по категориям");
  wc.addRow(["Категория", "Сумма"]).font = { bold: true };
  for (const c of data.byCategory) wc.addRow([c.name, c.amount]);
  wc.addRow(["Итого", data.byCategory.reduce((a, c) => a + c.amount, 0)]).font = { bold: true };
  wc.getColumn(1).width = 24;
  wc.getColumn(2).width = 16;
  wc.getColumn(2).numFmt = MONEY;

  return wb;
}
