import Link from "next/link";
import { formatTenge } from "@/lib/finance/format";
import { Money } from "@/components/Money";
import { DeleteButton } from "./DeleteButton";
import type { OpType } from "./actions";
import { createServerClient } from "@/lib/supabase/server";
import { getCategories, getStores } from "@/lib/data/refs";
import { periodRange, todayLocal } from "@/lib/finance/dates";

type Row = { type: OpType; id: string; date: string; storeId: string | null; title: string; amount: number; detail?: string };

const TYPE_LABEL: Record<OpType, string> = { sale: "Итог дня", expense: "Расход", purchase: "Закупка", draw: "В личное" };

function shiftMonth(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export default async function OperationsPage({ searchParams }: { searchParams: Promise<{ m?: string; store?: string; type?: string }> }) {
  const sp = await searchParams;
  const ym = /^\d{4}-\d{2}$/.test(sp.m ?? "") ? sp.m! : todayLocal().slice(0, 7);
  const { from, to } = periodRange("month", `${ym}-01`);
  const sb = await createServerClient();
  const [stores, cats, sales, exps, purs, draws] = await Promise.all([
    getStores(),
    getCategories("business"),
    sb.from("day_sales").select("*").gte("date", from).lte("date", to),
    sb.from("expenses").select("*").gte("date", from).lte("date", to),
    sb.from("purchases").select("*").gte("date", from).lte("date", to),
    sb.from("owner_draws").select("*").gte("date", from).lte("date", to),
  ]);
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? "—";
  const storeName = (id: string | null) => (id ? stores.find((s) => s.id === id)?.name ?? "" : "Общий");

  let rows: Row[] = [
    ...(sales.data ?? []).map((r) => ({
      type: "sale" as const, id: r.id, date: r.date, storeId: r.store_id, title: "Итог дня",
      amount: Number(r.kaspi) + Number(r.cash) + Number(r.terminal) + Number(r.mixed ?? 0),
      detail: [
        `Kaspi ${formatTenge(Number(r.kaspi))}`,
        `нал ${formatTenge(Number(r.cash))}`,
        Number(r.terminal) ? `терм ${formatTenge(Number(r.terminal))}` : "",
        Number(r.mixed) ? `смеш ${formatTenge(Number(r.mixed))}` : "",
        `закуп ${formatTenge(Number(r.cogs))}`,
        r.source === "import" ? "из кассы" : "",
      ].filter(Boolean).join(" · "),
    })),
    ...(exps.data ?? []).map((r) => ({ type: "expense" as const, id: r.id, date: r.date, storeId: r.store_id, title: catName(r.category_id), amount: -Number(r.amount), detail: r.note ?? undefined })),
    ...(purs.data ?? []).map((r) => ({ type: "purchase" as const, id: r.id, date: r.date, storeId: r.store_id, title: "Закупка товара", amount: -Number(r.amount), detail: r.note ?? undefined })),
    ...(draws.data ?? []).map((r) => ({ type: "draw" as const, id: r.id, date: r.date, storeId: r.store_id, title: "Вывод в личное", amount: -Number(r.amount), detail: r.note ?? undefined })),
  ];
  if (sp.store) rows = rows.filter((r) => (sp.store === "shared" ? r.storeId === null : r.storeId === sp.store));
  if (sp.type) rows = rows.filter((r) => r.type === sp.type);
  rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const byDate = new Map<string, Row[]>();
  for (const r of rows) byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]);

  const q = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { m: ym, store: sp.store, type: sp.type, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/operations?${p}`;
  };
  const chip = (active: boolean) => `rounded-full border px-3 py-1.5 text-sm ${active ? "border-accent bg-accent text-accent-text" : "border-border bg-surface"}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Операции</h1>
        <div className="flex items-center gap-2">
          <Link href={q({ m: shiftMonth(ym, -1) })} className="btn-ghost px-3 py-1.5" aria-label="Предыдущий месяц">‹</Link>
          <span className="w-20 text-center font-medium">{ym}</span>
          <Link href={q({ m: shiftMonth(ym, 1) })} className="btn-ghost px-3 py-1.5" aria-label="Следующий месяц">›</Link>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={q({ store: undefined })} className={chip(!sp.store)}>Все</Link>
        {stores.map((s) => <Link key={s.id} href={q({ store: s.id })} className={chip(sp.store === s.id)}>{s.name}</Link>)}
        <Link href={q({ store: "shared" })} className={chip(sp.store === "shared")}>Общий</Link>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={q({ type: undefined })} className={chip(!sp.type)}>Все типы</Link>
        {(Object.keys(TYPE_LABEL) as OpType[]).map((t) => <Link key={t} href={q({ type: t })} className={chip(sp.type === t)}>{TYPE_LABEL[t]}</Link>)}
      </div>

      {rows.length === 0 && <p className="card text-muted">За этот месяц записей нет.</p>}
      {[...byDate.entries()].map(([date, list]) => (
        <section key={date} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">{date.split("-").reverse().join(".")}</h2>
          <ul className="card divide-y divide-border p-0">
            {list.map((r) => (
              <li key={r.type + r.id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="font-medium">{r.title} <span className="text-xs text-muted">· {storeName(r.storeId)}</span></div>
                  {r.detail && <div className="truncate text-xs text-muted">{r.detail}</div>}
                  <div className="mt-1 flex gap-4">
                    <Link href={`/add?edit=${r.type}:${r.id}`} className="text-sm text-accent">Изменить</Link>
                    <DeleteButton type={r.type} id={r.id} />
                  </div>
                </div>
                <Money value={r.amount} signed className="font-semibold" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
