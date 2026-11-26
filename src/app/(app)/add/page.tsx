import { notFound } from "next/navigation";
import { EntryForm, type EntryInitial } from "./EntryForm";
import { getCategories, getStores } from "@/lib/data/refs";
import { createServerClient } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/finance/dates";
import type { EntryType } from "./actions";

const TABLE: Record<EntryType, string> = { sale: "day_sales", expense: "expenses", purchase: "purchases", draw: "owner_draws" };
const TITLE: Record<EntryType, string> = { sale: "итог дня", expense: "расход", purchase: "закупку", draw: "вывод в личное" };

async function loadEdit(edit: string): Promise<EntryInitial | null> {
  const [type, id] = edit.split(":") as [EntryType, string];
  if (!TABLE[type] || !id) return null;
  const sb = await createServerClient();
  const { data } = await sb.from(TABLE[type]).select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    type,
    date: data.date,
    storeId: data.store_id ?? "shared",
    kaspi: data.kaspi,
    cash: data.cash,
    terminal: data.terminal,
    cogs: data.cogs,
    amount: data.amount,
    categoryId: data.category_id,
    note: data.note,
  };
}

export default async function AddPage({ searchParams }: { searchParams: Promise<{ edit?: string; type?: string }> }) {
  const sp = await searchParams;
  const [stores, categories] = await Promise.all([getStores(), getCategories("business")]);
  let initial: EntryInitial = { type: (TABLE[sp.type as EntryType] ? sp.type : "sale") as EntryType, date: todayLocal() };
  if (sp.edit) {
    const loaded = await loadEdit(sp.edit);
    if (!loaded) notFound();
    initial = loaded;
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{initial.id ? `Изменить ${TITLE[initial.type]}` : "Новая запись"}</h1>
      <EntryForm stores={stores} categories={categories} initial={initial} />
    </div>
  );
}
