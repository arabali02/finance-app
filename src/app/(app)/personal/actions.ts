"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { parseAmount } from "@/lib/finance/validate";

export type PersonalState = { error?: string; ok?: number };

export async function addPersonal(_prev: PersonalState, fd: FormData): Promise<PersonalState> {
  const kind = String(fd.get("kind") ?? "");
  const category_id = String(fd.get("category_id") ?? "");
  const date = String(fd.get("date") ?? "");
  const note = String(fd.get("note") ?? "").trim() || null;
  if (kind !== "income" && kind !== "expense") return { error: "Выберите доход или расход" };
  if (!category_id) return { error: "Выберите категорию" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Укажите дату" };
  const amount = parseAmount(String(fd.get("amount") ?? ""));
  if (!amount.ok) return { error: amount.error };

  const sb = await createServerClient();
  const { error } = await sb.from("personal_txns").insert({ kind, category_id, date, amount: amount.value, note });
  if (error) return { error: "Не удалось сохранить" };
  revalidatePath("/personal");
  return { ok: Date.now() };
}

export async function deletePersonal(id: string): Promise<{ error?: string }> {
  const sb = await createServerClient();
  const { data: linked } = await sb.from("owner_draws").select("id").eq("personal_txn_id", id).maybeSingle();
  if (linked) return { error: "Это вывод из бизнеса — удалите его в «Операциях»" };
  const { error } = await sb.from("personal_txns").delete().eq("id", id);
  if (error) return { error: "Не удалось удалить" };
  revalidatePath("/personal");
  return {};
}
