// Чтение таблиц из PDF-отчётов кассы: границы ячеек берём из линий таблицы,
// текст раскладываем по ячейкам. Работает в браузере (pdfjs-dist) и в тестах (legacy-сборка).

type Matrix = [number, number, number, number, number, number];
type PdfJs = {
  getDocument: (src: { data: Uint8Array }) => { promise: Promise<PdfDoc> };
  OPS: Record<string, number>;
};
type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage> };
type PdfPage = {
  view: number[];
  getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[][] }>;
  getTextContent: () => Promise<{ items: unknown[] }>;
};
type TextItem = { str: string; transform: number[] };

const mul = (m: Matrix, n: number[]): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m: Matrix, x: number, y: number) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function cluster(values: number[], tol = 1.5): number[] {
  const out: number[] = [];
  for (const v of [...values].sort((a, b) => a - b)) if (!out.length || v - out[out.length - 1] > tol) out.push(v);
  return out;
}

export async function extractRows(data: Uint8Array, pdfjs: PdfJs): Promise<string[][]> {
  const { OPS } = pdfjs;
  const doc = await pdfjs.getDocument({ data }).promise;
  const all: { row: string[]; first: boolean }[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const ops = await page.getOperatorList();
    const identity: Matrix = [1, 0, 0, 1, 0, 0];
    let ctm: Matrix = identity;
    const stack: Matrix[] = [];
    const hs: number[] = [];
    const vs: number[] = [];
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const a = ops.argsArray[i];
      if (fn === OPS.save) stack.push(ctm);
      else if (fn === OPS.restore) ctm = stack.pop() ?? identity;
      else if (fn === OPS.transform) ctm = mul(ctm, a as number[]);
      else if (fn === OPS.constructPath && a[0] === OPS.fill) {
        const mm = a[2] as number[];
        const [ax, ay] = apply(ctm, mm[0], mm[1]);
        const [bx, by] = apply(ctm, mm[2], mm[3]);
        const w = Math.abs(bx - ax);
        const h = Math.abs(by - ay);
        if (h < 2 && w > 5) hs.push((ay + by) / 2);
        else if (w < 2 && h > 5) vs.push((ax + bx) / 2);
      }
    }
    if (!hs.length || !vs.length) continue;

    const view = page.view;
    const ys = cluster([...hs, view[1], view[3]]).sort((a, b) => b - a); // сверху вниз, с краями страницы
    const xs = cluster(vs);
    const grid = new Map<number, { s: string; x: number; y: number }[]>();
    const text = await page.getTextContent();
    for (const raw of text.items) {
      const it = raw as TextItem;
      if (!it.str?.trim()) continue;
      const x = it.transform[4] + 1;
      const y = it.transform[5] + 2;
      const ci = xs.findIndex((v, k) => k < xs.length - 1 && x >= v && x < xs[k + 1]);
      const ri = ys.findIndex((v, k) => k < ys.length - 1 && y <= v && y > ys[k + 1]);
      if (ci < 0 || ri < 0) continue;
      const key = ri * 1000 + ci;
      const cell = grid.get(key) ?? [];
      cell.push({ s: it.str, x, y });
      grid.set(key, cell);
    }
    for (let r = 0; r < ys.length - 1; r++) {
      const row: string[] = [];
      for (let c = 0; c < xs.length - 1; c++) {
        const parts = (grid.get(r * 1000 + c) ?? []).sort((a, b) => b.y - a.y || a.x - b.x);
        row.push(parts.map((q) => q.s).join(" "));
      }
      if (row.some(Boolean)) all.push({ row, first: r === 0 });
    }
  }

  // Строка, разорванная переносом страницы: её продолжение приклеиваем к предыдущей строке.
  const out: string[][] = [];
  for (const { row, first } of all) {
    const prev = out[out.length - 1];
    if (first && prev && prev.length === row.length && !row[0].trim()) {
      row.forEach((v, i) => {
        if (v) prev[i] = prev[i] ? `${prev[i]} ${v}` : v;
      });
    } else out.push(row);
  }
  return out;
}
