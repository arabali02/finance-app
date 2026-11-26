"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatTenge } from "@/lib/finance/format";

const SERIES = ["var(--series-1)", "var(--series-2)"];
const short = (n: number) => {
  const a = Math.abs(n);
  const s =
    a >= 1e6
      ? `${(a / 1e6).toFixed(1).replace(".0", "").replace(".", ",")}\u00a0млн`
      : a >= 1e3
        ? `${Math.round(a / 1e3)}\u00a0тыс`
        : String(a);
  return (n < 0 ? "−" : "") + s;
};
const tooltipStyle = {
  contentStyle: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)" },
  labelStyle: { color: "var(--muted)" },
  cursor: { fill: "var(--surface-2)" },
};

export function StoreProfitChart({ data }: { data: { name: string; net: number }[] }) {
  return (
    <figure className="card space-y-2">
      <figcaption className="font-semibold">Чистая прибыль по магазинам</figcaption>
      <div className="flex gap-4 text-xs text-muted">
        {data.map((d, i) => (
          <span key={d.name} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i % 2] }} />
            {d.name}
          </span>
        ))}
      </div>
      <div className="h-56">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 24, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
            <YAxis tickFormatter={short} tickLine={false} axisLine={false} width={64} tick={{ fill: "var(--muted)", fontSize: 11 }} />
            <ReferenceLine y={0} stroke="var(--muted)" />
            <Tooltip {...tooltipStyle} formatter={(v) => [formatTenge(Number(v)), "Чистая прибыль"]} />
            <Bar dataKey="net" maxBarSize={56} radius={[4, 4, 4, 4]}>
              {data.map((d, i) => (
                <Cell key={d.name} fill={SERIES[i % 2]} />
              ))}
              <LabelList dataKey="net" position="top" formatter={(v) => short(Number(v))} style={{ fill: "var(--text)", fontSize: 12 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export function CategoryChart({ data }: { data: { name: string; amount: number }[] }) {
  if (data.length === 0) return null;
  return (
    <figure className="card space-y-2">
      <figcaption className="font-semibold">Расходы по категориям</figcaption>
      <div style={{ height: Math.max(120, data.length * 40) }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 64, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} tick={{ fill: "var(--text)", fontSize: 12 }} />
            <Tooltip {...tooltipStyle} formatter={(v) => [formatTenge(Number(v)), "Сумма"]} />
            <Bar dataKey="amount" fill="var(--series-1)" maxBarSize={22} radius={[0, 4, 4, 0]}>
              <LabelList dataKey="amount" position="right" formatter={(v) => short(Number(v))} style={{ fill: "var(--text)", fontSize: 12 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
