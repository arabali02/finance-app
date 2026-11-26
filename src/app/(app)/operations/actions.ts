"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

const TABLE = { sale: "day_sales", expense: "expenses", purchase: "purchases", draw: "owner_draws" } as const;
export type OpType = keyof typeof TABLE;

export async function deleteOperation(type: OpType, id: string): Promise<{ error?: string }> {
  if (!TABLE[type]) return { error: "Неизвестный тип" };
  const sb = await createServerClient();
  if (type === "draw") {
    const { data } = await sb.from("owner_draws").select("personal_txn_id").eq("id", id).maybeSingle();
    const { error } = await sb.from("owner_draws").delete().eq("id", id);
    if (error) return { error: "Не удалось удалить" };
    if (data?.personal_txn_id) await sb.from("personal_txns").delete().eq("id", data.personal_txn_id);
  } else {
    const { error } = await sb.from(TABLE[type]).delete().eq("id", id);
    if (error) return { error: "Не удалось удалить" };
  }
  revalidatePath("/", "layout");
  return {};
}
