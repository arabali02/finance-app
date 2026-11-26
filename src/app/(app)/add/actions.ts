"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { parseAmount } from "@/lib/finance/validate";

export type EntryType = "sale" | "expense" | "purchase" | "draw";
export type EntryState = { error?: string; fieldErrors?: Record<string, string> };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

function amounts(fd: FormData, keys: string[], allowZero: boolean) {
  const values: Record<string, number> = {};
  const fieldErrors: Record<string, string> = {};
  for (const k of keys) {
    const r = parseAmount(str(fd, k), { allowZero });
    if (r.ok) values[k] = r.value;
    else fieldErrors[k] = r.error;
  }
  return { values, fieldErrors };
}

export async function saveEntry(_prev: EntryState, fd: FormData): Promise<EntryState> {
  const type = str(fd, "type") as EntryType;
  const id = str(fd, "id") || null;
  const date = str(fd, "date");
  const storeRaw = str(fd, "store_id");
  const storeId = storeRaw === "shared" || storeRaw === "" ? null : storeRaw;
  const note = str(fd, "note") || null;

  if (!DATE_RE.test(date)) return { error: "Укажите дату" };
  const sb = await createServerClient();

  if (type === "sale") {
    if (!storeId) return { error: "Выберите магазин" };
    const { values, fieldErrors } = amounts(fd, ["kaspi", "cash", "terminal", "cogs"], true);
    if (Object.keys(fieldErrors).length) return { fieldErrors };
    if (values.kaspi + values.cash + values.terminal === 0) return { error: "Введите хотя бы одну сумму продаж" };
    const row = { store_id: storeId, date, ...values };
    const res = id
      ? await sb.from("day_sales").update(row).eq("id", id)
      : await sb.from("day_sales").upsert(row, { onConflict: "user_id,store_id,date" });
    if (res.error) {
      if (res.error.code === "23505") return { error: "Итог за этот день по магазину уже есть — отредактируйте его" };
      return { error: "Не удалось сохранить" };
    }
  } else {
    const { values, fieldErrors } = amounts(fd, ["amount"], false);
    if (Object.keys(fieldErrors).length) return { fieldErrors };
    const amount = values.amount;

    if (type === "expense") {
      const category_id = str(fd, "category_id");
      if (!category_id) return { error: "Выберите категорию" };
      const row = { store_id: storeId, date, category_id, amount, note };
      const res = id ? await sb.from("expenses").update(row).eq("id", id) : await sb.from("expenses").insert(row);
      if (res.error) return { error: "Не удалось сохранить" };
    } else if (type === "purchase") {
      if (!storeId) return { error: "Выберите магазин" };
      const row = { store_id: storeId, date, amount, note };
      const res = id ? await sb.from("purchases").update(row).eq("id", id) : await sb.from("purchases").insert(row);
      if (res.error) return { error: "Не удалось сохранить" };
    } else if (type === "draw") {
      const err = await saveDraw(sb, { id, storeId, date, amount, note });
      if (err) return { error: err };
    } else {
      return { error: "Неизвестный тип операции" };
    }
  }

  revalidatePath("/", "layout");
  redirect(`/?saved=${type}`);
}

type Sb = Awaited<ReturnType<typeof createServerClient>>;

async function saveDraw(
  sb: Sb,
  d: { id: string | null; storeId: string | null; date: string; amount: number; note: string | null },
): Promise<string | null> {
  const { error } = await sb.rpc("save_owner_draw", {
    p_id: d.id,
    p_store: d.storeId,
    p_date: d.date,
    p_amount: d.amount,
    p_note: d.note,
  });
  if (!error) return null;
  return error.code === "P0002" ? error.message : "Не удалось сохранить";
}
