"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importSales, importStock } from "./actions";
import { detectReport, parseSales, parseStock, type ProductRow, type SaleRow } from "@/lib/import/reports";
import { extractRows } from "@/lib/import/pdfTable";
import { formatTenge } from "@/lib/finance/format";

type Parsed =
  | { file: string; kind: "stock"; store: string; rows: ProductRow[] }
  | { file: string; kind: "sales"; store: string; from: string; to: string; rows: SaleRow[] }
  | { file: string; kind: "error"; error: string };

const ru = (d: string) => d.split("-").reverse().join(".");

async function readPdf(file: File): Promise<Parsed> {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    const rows = await extractRows(new Uint8Array(await file.arrayBuffer()), pdfjs as never);
    const info = detectReport(rows);
    if (info.kind === "unknown") return { file: file.name, kind: "error", error: "Не похоже на отчёт кассы (остатки или продажи)" };
    if (!info.store) return { file: file.name, kind: "error", error: "В отчёте не найден магазин (Kemel или Jaryq)" };
    if (info.kind === "stock") return { file: file.name, kind: "stock", store: info.store, rows: parseStock(rows) };
    return { file: file.name, kind: "sales", store: info.store, from: info.from, to: info.to, rows: parseSales(rows) };
  } catch {
    return { file: file.name, kind: "error", error: "Не удалось прочитать PDF" };
  }
}

export function ImportReports() {
  const router = useRouter();
  const [parsed, setParsed] = useState<Parsed[]>([]);
  const [busy, setBusy] = useState<"read" | "save" | null>(null);
  const [results, setResults] = useState<{ ok: boolean; text: string }[]>([]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setResults([]);
    setBusy("read");
    const list = await Promise.all([...files].map(readPdf));
    // остатки раньше продаж: из них берётся закуп
    list.sort((a, b) => (a.kind === "stock" ? -1 : 0) - (b.kind === "stock" ? -1 : 0));
    setParsed(list);
    setBusy(null);
  }

  async function save() {
    setBusy("save");
    const out: { ok: boolean; text: string }[] = [];
    for (const p of parsed) {
      if (p.kind === "error") continue;
      const r = p.kind === "stock" ? await importStock(p.store, p.rows) : await importSales(p.store, p.rows);
      out.push({ ok: !r.error, text: r.error ?? r.message ?? "" });
    }
    setResults(out);
    setParsed([]);
    setBusy(null);
    router.refresh();
  }

  const ready = parsed.some((p) => p.kind !== "error");

  return (
    <section className="card space-y-3">
      <div>
        <h2 className="font-semibold">Загрузить отчёты из кассы</h2>
        <p className="text-sm text-muted">
          PDF «Отчет по остаткам товаров» и «Отчет по продажам». Можно выбрать сразу несколько файлов.
        </p>
      </div>
      <label className="btn-ghost block cursor-pointer text-center">
        {busy === "read" ? "Читаем файлы…" : "Выбрать PDF"}
        <input
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          disabled={!!busy}
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {parsed.length > 0 && (
        <ul className="space-y-2 text-sm">
          {parsed.map((p, i) => (
            <li key={i} className="rounded-xl bg-surface-2 p-3">
              <div className="truncate text-xs text-muted">{p.file}</div>
              {p.kind === "error" && <div className="text-negative">{p.error}</div>}
              {p.kind === "stock" && (
                <div>
                  <b>Остатки {p.store}</b>: {p.rows.length} позиций, {p.rows.reduce((a, r) => a + r.qty, 0)} шт. на{" "}
                  {formatTenge(p.rows.reduce((a, r) => a + r.qty * r.cost, 0))} по закупу
                </div>
              )}
              {p.kind === "sales" && (
                <div>
                  <b>Продажи {p.store}</b> {ru(p.from)} — {ru(p.to)}: {p.rows.length} продаж на{" "}
                  {formatTenge(p.rows.reduce((a, r) => a + r.sum, 0))}
                  <div className="text-xs text-muted">Итоги дней за этот период заменятся данными из отчёта.</div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {ready && (
        <button type="button" className="btn-primary w-full" disabled={!!busy} onClick={save}>
          {busy === "save" ? "Сохраняем…" : "Загрузить на сайт"}
        </button>
      )}
      {results.map((r, i) => (
        <p key={i} role={r.ok ? "status" : "alert"} className={`text-sm ${r.ok ? "text-positive" : "text-negative"}`}>
          {r.ok ? "✓ " : ""}
          {r.text}
        </p>
      ))}
    </section>
  );
}
