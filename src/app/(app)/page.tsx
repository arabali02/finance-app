import Link from "next/link";
import { AddButton } from "@/components/Nav";
import { Money } from "@/components/Money";
import { loadPeriod } from "@/lib/data/loadPeriod";
import { computeProfit } from "@/lib/finance/profit";
import { periodRange, todayLocal } from "@/lib/finance/dates";

const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];

async function ProfitCard({ title, from, to }: { title: string; from: string; to: string }) {
  const data = await loadPeriod(from, to);
  const { byStore, total } = computeProfit(data);
  const name = (id: string) => data.stores.find((s) => s.id === id)?.name ?? "";
  return (
    <section className="card space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs text-muted">чистая прибыль</span>
      </div>
      <Money value={total.net} signed className="block text-4xl font-bold tracking-tight" />
      <div className="grid grid-cols-2 gap-3">
        {byStore.map((s) => (
          <div key={s.storeId} className="rounded-xl bg-surface-2 p-3">
            <div className="text-xs text-muted">{name(s.storeId)}</div>
            <Money value={s.net} signed className="text-lg font-semibold" />
            <div className="text-xs text-muted">
              выручка <Money value={s.revenue} />
            </div>
          </div>
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">Выручка</dt>
        <dd className="text-right"><Money value={total.revenue} /></dd>
        <dt className="text-muted">Себестоимость</dt>
        <dd className="text-right"><Money value={-total.cogs} /></dd>
        <dt className="text-muted">Расходы</dt>
        <dd className="text-right"><Money value={-total.opex} /></dd>
        <dt className="text-muted">Налог</dt>
        <dd className="text-right"><Money value={-total.tax} /></dd>
      </dl>
      <p className="border-t border-border pt-3 text-xs text-muted">
        Деньги: закуплено товара <Money value={data.purchasesTotal} />, выведено в личное <Money value={data.drawsTotal} />
      </p>
    </section>
  );
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const today = todayLocal();
  const month = periodRange("month", today);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Главная</h1>
        <Link href="/add" className="hidden md:inline-flex btn-ghost text-sm">+ Запись</Link>
      </div>
      {saved && (
        <p role="status" className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
          ✓ Сохранено
        </p>
      )}
      <ProfitCard title="Сегодня" from={today} to={today} />
      <ProfitCard title={`Месяц — ${MONTHS[Number(today.slice(5, 7)) - 1]}`} from={month.from} to={month.to} />
      <AddButton />
    </div>
  );
}
