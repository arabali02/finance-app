"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/data/fetchAll";
import { aggregateDays, type ProductRow, type SaleRow } from "@/lib/import/reports";

type Sb = Awaited<ReturnType<typeof createServerClient>>;
export type ImportResult = { error?: string; message?: string };

const MAX_ROWS = 50_000;
const isInt = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0;

async function findStore(sb: Sb, name: string) {
  const { data, error } = await sb.from("stores").select("id,name").ilike("name", name.trim());
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function importStock(storeName: string, rows: ProductRow[]): Promise<ImportResult> {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_ROWS) return { error: "В отчёте нет товаров" };
  if (!rows.every((r) => r.barcode && r.name && isInt(r.cost) && isInt(r.price) && typeof r.qty === "number"))
    return { error: "Отчёт прочитан с ошибками — загрузите его ещё раз" };
  const sb = await createServerClient();
  const store = await findStore(sb, storeName);
  if (!store) return { error: `Магазин «${storeName}» не найден — проверьте название в настройках` };

  // один штрихкод — одна строка (последняя в отчёте)
  const unique = new Map(rows.map((r) => [r.barcode, r]));
  const now = new Date().toISOString();
  const payload = [...unique.values()].map((r) => ({
    store_id: store.id,
    article: r.article,
    barcode: r.barcode,
    name: r.name,
    color: r.color,
    size: r.size,
    qty: r.qty,
    cost: r.cost,
    price: r.price,
    updated_at: now,
  }));
  for (let i = 0; i < payload.length; i += 500) {
    const { error } = await sb.from("products").upsert(payload.slice(i, i + 500), { onConflict: "user_id,store_id,barcode" });
    if (error) return { error: "Не удалось сохранить товары" };
  }
  revalidatePath("/", "layout");
  return { message: `${store.name}: товаров обновлено — ${payload.length}` };
}

export async function importSales(storeName: string, sales: SaleRow[]): Promise<ImportResult> {
  if (!Array.isArray(sales) || sales.length === 0 || sales.length > MAX_ROWS) return { error: "В отчёте нет продаж" };
  if (!sales.every((s) => /^\d{4}-\d{2}-\d{2}$/.test(s.date) && isInt(s.sum) && ["kaspi", "cash", "mixed"].includes(s.method)))
    return { error: "Отчёт прочитан с ошибками — загрузите его ещё раз" };
  const sb = await createServerClient();
  const store = await findStore(sb, storeName);
  if (!store) return { error: `Магазин «${storeName}» не найден — проверьте название в настройках` };

  const products = await fetchAll<{ barcode: string; cost: number }>((from, to) =>
    sb.from("products").select("barcode,cost").eq("store_id", store.id).range(from, to),
  );
  if (products.length === 0) return { error: `Сначала загрузите отчёт по остаткам ${store.name} — из него берётся закуп` };

  const { days, unmatched, returned } = aggregateDays(sales, new Map(products.map((p) => [p.barcode, Number(p.cost)])));
  const payload = days.map((d) => ({
    store_id: store.id,
    date: d.date,
    kaspi: d.kaspi,
    cash: d.cash,
    terminal: 0,
    mixed: d.mixed,
    cogs: d.cogs,
    source: "import",
  }));
  const { error } = await sb.from("day_sales").upsert(payload, { onConflict: "user_id,store_id,date" });
  if (error) return { error: "Не удалось сохранить продажи" };

  revalidatePath("/", "layout");
  const parts = [`${store.name}: загружено дней — ${days.length}`];
  if (returned.count) parts.push(`возвратов не учтено — ${returned.count}`);
  if (unmatched.count) parts.push(`продаж без закупа — ${unmatched.count} (нет в отчёте по остаткам)`);
  return { message: parts.join("; ") };
}
