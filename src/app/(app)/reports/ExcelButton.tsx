"use client";

import { useState } from "react";
import type { ReportData } from "@/lib/finance/excel";

export function ExcelButton({ data }: { data: ReportData }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className="btn-ghost text-sm"
      onClick={async () => {
        setBusy(true);
        try {
          const { buildReportWorkbook } = await import("@/lib/finance/excel");
          const buf = await buildReportWorkbook(data).xlsx.writeBuffer();
          const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
          const a = document.createElement("a");
          a.href = url;
          a.download = `otchet_${data.period.from}_${data.period.to}.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Готовим…" : "⤓ Скачать Excel"}
    </button>
  );
}
