import { describe, it, expect } from "vitest";
import { detectReport, parseStock, parseSales, aggregateDays } from "./reports";

const stockRows = [
  ["Артик", "Штрихко", "Номе нкл.", "", "", "Раз", "Кол-", "Колич ество", "Всего", "В", "Цена закупа", "", "Цена продажи", ""],
  ["Барсетка", "", "", "", "", "", "", "", "", "", "", "", "", ""],
  ["01053 36122", "20275501 68120", "", "Барсетка Kemel", "-", "-", "0.00", "1", "0.00", "0.00", "4 200.00", "0.00", "11 900.00", "0.00"],
  ["01005 96874", "20200392 61022", "", "куртка Manzone (Черный / 3XL)", "Black", "3XL", "1.00", "1", "1.00", "0.00", "21 500.00", "21 500.00", "29 900.00", "29 900.00"],
];
const head = ["Торговые точки:", "", "", "Kemel", "", "Отчет по продажам Период: 23.10.2026 - 26.11.2026", "", "", "", "", "", "", "", "", "", "", "", ""];
const sale = (d: string, bc: string, sum: string, method: string, note = "-") =>
  [d, "17:45: 41", "010956 6072", bc, "-", "Товар", "Gray", "L", "1", sum, "0.00", sum, "0.00", method, "-", "Частно е лицо", "1 Кассир", note];
const salesRows = [
  head,
  sale("24.10.2 026", "20275501 68120", "11 900.00", "Безнал ичные"),
  sale("24.10.2 026", "20200392 61022", "29 900.00", "Наличн ые"),
  sale("25.10.2 026", "20275501 68120", "11 900.00", "Смеша нный"),
  sale("25.10.2 026", "99999999 99999", "5 000.00", "Безнал ичные"),
  sale("29.10.2 026", "20275501 68120", "11 900.00", "Безнал ичные", "Оформ лен возвра т №3 от 29.10.2 026"),
  ["", "", "", "", "", "", "", "", "", "ИТОГО:", "", "70 600.00", "0.00", "", "", "", "", ""],
];

describe("detectReport", () => {
  it("узнаёт отчёт по продажам, магазин и период", () => {
    expect(detectReport(salesRows)).toEqual({ kind: "sales", store: "Kemel", from: "2026-10-23", to: "2026-11-26" });
  });
  it("узнаёт отчёт по остаткам", () => {
    expect(detectReport([["Kemel"], ...stockRows]).kind).toBe("stock");
  });
  it("незнакомый файл", () => {
    expect(detectReport([["что-то"]]).kind).toBe("unknown");
  });
});

it("parseStock: позиции с ценами в целых тенге", () => {
  expect(parseStock(stockRows)).toEqual([
    { article: "0105336122", barcode: "2027550168120", name: "Барсетка Kemel", color: "", size: "", qty: 0, cost: 4200, price: 11900 },
    { article: "0100596874", barcode: "2020039261022", name: "куртка Manzone (Черный / 3XL)", color: "Black", size: "3XL", qty: 1, cost: 21500, price: 29900 },
  ]);
});

it("parseSales: даты, способы оплаты, возвраты", () => {
  const s = parseSales(salesRows);
  expect(s).toHaveLength(5);
  expect(s[0]).toMatchObject({ date: "2026-10-24", barcode: "2027550168120", qty: 1, sum: 11900, method: "kaspi", returned: false });
  expect(s[1].method).toBe("cash");
  expect(s[2].method).toBe("mixed");
  expect(s[4].returned).toBe(true);
});

it("aggregateDays: итоги дня по оплатам и закуп по штрихкоду, без возвратов", () => {
  const costs = new Map([["2027550168120", 4200], ["2020039261022", 21500]]);
  const r = aggregateDays(parseSales(salesRows), costs);
  expect(r.days).toEqual([
    { date: "2026-10-24", kaspi: 11900, cash: 29900, mixed: 0, cogs: 25700 },
    { date: "2026-10-25", kaspi: 5000, cash: 0, mixed: 11900, cogs: 4200 },
  ]);
  expect(r.unmatched).toEqual({ count: 1, sum: 5000 });
  expect(r.returned).toEqual({ count: 1, sum: 11900 });
});
