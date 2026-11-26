// Проверка на настоящих отчётах кассы. Файлы не хранятся в репозитории:
// KEMEL_STOCK_PDF=… KEMEL_SALES_PDF=… npx vitest run src/lib/import/realReports.test.ts
import { it, expect } from "vitest";
import fs from "node:fs";
import { extractRows } from "./pdfTable";
import { aggregateDays, detectReport, parseSales, parseStock } from "./reports";

const stockPdf = process.env.KEMEL_STOCK_PDF;
const salesPdf = process.env.KEMEL_SALES_PDF;

it.skipIf(!stockPdf || !salesPdf)("отчёты KEMEL: итоги совпадают с итогами в PDF", async () => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const read = (f: string) => extractRows(new Uint8Array(fs.readFileSync(f)), pdfjs as never);
  const [stockRows, salesRows] = await Promise.all([read(stockPdf!), read(salesPdf!)]);

  expect(detectReport(stockRows)).toEqual({ kind: "stock", store: "Kemel" });
  expect(detectReport(salesRows)).toEqual({ kind: "sales", store: "Kemel", from: "2026-10-23", to: "2026-11-26" });

  const stock = parseStock(stockRows);
  expect(stock).toHaveLength(668);
  expect(stock.reduce((a, p) => a + p.qty, 0)).toBe(540);
  expect(stock.reduce((a, p) => a + p.qty * p.cost, 0)).toBe(3_300_548);

  const sales = parseSales(salesRows);
  expect(sales).toHaveLength(513);
  expect(sales.reduce((a, s) => a + s.sum, 0)).toBe(8_264_710);

  const { days, unmatched, returned } = aggregateDays(sales, new Map(stock.map((p) => [p.barcode, p.cost])));
  const revenue = days.reduce((a, d) => a + d.kaspi + d.cash + d.mixed, 0);
  expect(revenue + returned.sum).toBe(8_264_710);
  expect(returned.count).toBe(3);
  expect(unmatched.count).toBe(4);
  console.log({ days: days.length, revenue, cogs: days.reduce((a, d) => a + d.cogs, 0), unmatched, returned });
}, 120_000);
