import Link from "next/link";
import { Money } from "@/components/Money";
import { DeletePersonal, PersonalForm } from "./PersonalForm";
import { createServerClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/data/refs";
import { periodRange, todayLocal } from "@/lib/finance/dates";

function shiftMonth(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

export default async function PersonalPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const today = todayLocal();
  const ym = /^\d{4}-\d{2}$/.test(sp.m ?? "") ? sp.m! : today.slice(0, 7);
  const { from, to } = periodRange("month", `${ym}-01`);
  const sb = await createServerClient();
  const [cats, txns] = await Promise.all([
    getCategories("personal"),
    sb.from("personal_txns").select("id,date,kind,category_id,amount,note").gte("date", from).lte("date", to).order("date", { ascending: false }),
  ]);
  const rows = (txns.data ?? []).map((t) => ({ ...t, amount: Number(t.amount) }));
  const income = rows.filter((r) => r.kind === "income").reduce((a, r) => a + r.amount, 0);
  const expense = rows.filter((r) => r.kind === "expense").reduce((a, r) => a + r.amount, 0);
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? "—";
  const byCat = new Map<string, number>();
  for (const r of rows) if (r.kind === "expense") byCat.set(r.category_id, (byCat.get(r.category_id) ?? 0) + r.amount);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Личный бюджет</h1>
        <div className="flex items-center gap-2">
          <Link href={`/personal?m=${shiftMonth(ym, -1)}`} className="btn-ghost px-3 py-1.5" aria-label="Предыдущий месяц">‹</Link>
          <span className="w-20 text-center font-medium">{ym}</span>
          <Link href={`/personal?m=${shiftMonth(ym, 1)}`} className="btn-ghost px-3 py-1.5" aria-label="Следующий месяц">›</Link>
        </div>
      </div>

      <section className="card grid grid-cols-3 gap-2 text-center">
        <div><div className="text-xs text-muted">Доходы</div><Money value={income} className="font-semibold" /></div>
        <div><div className="text-xs text-muted">Расходы</div><Money value={expense} className="font-semibold" /></div>
        <div><div className="text-xs text-muted">Остаток</div><Money value={income - expense} signed className="font-bold" /></div>
      </section>

      <PersonalForm categories={cats} today={today} />

      {byCat.size > 0 && (
        <section className="card space-y-2">
          <h2 className="font-semibold">Расходы по категориям</h2>
          {[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([id, amt]) => (
            <div key={id} className="flex justify-between text-sm"><span>{catName(id)}</span><Money value={amt} /></div>
          ))}
        </section>
      )}

      <ul className="card divide-y divide-border p-0">
        {rows.length === 0 && <li className="p-3 text-muted">Записей за месяц нет.</li>}
        {rows.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-3 p-3">
            <div className="min-w-0">
              <div className="font-medium">{catName(r.category_id)}</div>
              <div className="truncate text-xs text-muted">{r.date.split("-").reverse().join(".")}{r.note ? ` · ${r.note}` : ""}</div>
              <DeletePersonal id={r.id} />
            </div>
            <Money value={r.kind === "income" ? r.amount : -r.amount} signed className="font-semibold" />
          </li>
        ))}
      </ul>
    </div>
  );
}
