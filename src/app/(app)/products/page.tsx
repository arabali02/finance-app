import Link from "next/link";
import { Money } from "@/components/Money";
import { ImportReports } from "./ImportReports";
import { createServerClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/data/fetchAll";
import { getStores } from "@/lib/data/refs";

type Product = { id: string; store_id: string; name: string; size: string; qty: number; cost: number; price: number };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ store?: string; q?: string; all?: string }> }) {
  const sp = await searchParams;
  const sb = await createServerClient();
  const stores = await getStores();
  const storeId = stores.some((s) => s.id === sp.store) ? sp.store! : stores[0]?.id;
  const rows = storeId
    ? await fetchAll<Product>((from, to) =>
        sb.from("products").select("id,store_id,name,size,qty,cost,price").eq("store_id", storeId).order("name").range(from, to),
      )
    : [];
  const all = rows.map((r) => ({ ...r, qty: Number(r.qty), cost: Number(r.cost), price: Number(r.price) }));
  const q = (sp.q ?? "").trim().toLowerCase();
  const list = all.filter((p) => (sp.all ? true : p.qty > 0) && (!q || p.name.toLowerCase().includes(q)));
  const inStock = all.filter((p) => p.qty > 0);
  const qty = inStock.reduce((a, p) => a + p.qty, 0);
  const atCost = inStock.reduce((a, p) => a + p.qty * p.cost, 0);
  const atPrice = inStock.reduce((a, p) => a + p.qty * p.price, 0);
  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ store: storeId, q: sp.q, all: sp.all, ...patch })) if (v) p.set(k, v);
    return `/products?${p}`;
  };
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm ${active ? "border-accent bg-accent text-accent-text" : "border-border bg-surface"}`;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Товары</h1>
      <ImportReports />

      <div className="flex flex-wrap gap-2">
        {stores.map((s) => (
          <Link key={s.id} href={link({ store: s.id })} className={chip(s.id === storeId)}>{s.name}</Link>
        ))}
      </div>

      {all.length === 0 ? (
        <p className="card text-muted">Товаров пока нет — загрузите «Отчет по остаткам товаров» из кассы.</p>
      ) : (
        <>
          <section className="card grid grid-cols-3 gap-2 text-center">
            <div><div className="text-xs text-muted">В наличии</div><div className="font-semibold">{qty} шт.</div></div>
            <div><div className="text-xs text-muted">По закупу</div><Money value={atCost} className="font-semibold" /></div>
            <div><div className="text-xs text-muted">По цене продажи</div><Money value={atPrice} className="font-semibold" /></div>
          </section>

          <form className="flex gap-2">
            <input type="hidden" name="store" value={storeId} />
            {sp.all && <input type="hidden" name="all" value="1" />}
            <input name="q" defaultValue={sp.q} placeholder="Поиск по названию" className="field py-2" aria-label="Поиск" />
            <button className="btn-ghost py-2">Найти</button>
          </form>
          <div className="flex gap-2">
            <Link href={link({ all: undefined })} className={chip(!sp.all)}>В наличии</Link>
            <Link href={link({ all: "1" })} className={chip(!!sp.all)}>Все позиции</Link>
          </div>

          <ul className="card divide-y divide-border p-0">
            {list.length === 0 && <li className="p-3 text-muted">Ничего не найдено.</li>}
            {list.map((p) => {
              const markup = p.cost > 0 ? Math.round(((p.price - p.cost) / p.cost) * 100) : null;
              return (
                <li key={p.id} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted">
                      {p.size && `${p.size} · `}остаток {p.qty} шт. · закуп <Money value={p.cost} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Money value={p.price} className="font-semibold" />
                    {markup !== null && <div className="text-xs text-muted">наценка {markup}%</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
