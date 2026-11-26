"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

const TABLE = { sale: "day_sales", expense: "expenses", purchase: "purchases", draw: "owner_draws" } as const;
export type OpType = keyof typeof TABLE;

export async function deleteOperation(type: OpType, id: string): Promise<{ error?: string }> {
  if (!TABLE[type]) return { error: "Неизвестный тип" };
  const sb = await createServerClient();
  if (type === "draw") {
    const { error } = await sb.rpc("delete_owner_draw", { p_id: id });
    if (error) return { error: "Не удалось удалить" };
  } else {
    const { error } = await sb.from(TABLE[type]).delete().eq("id", id);
    if (error) return { error: "Не удалось удалить" };
  }
  revalidatePath("/", "layout");
  return {};
}
