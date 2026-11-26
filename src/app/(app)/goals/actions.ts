"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { parseAmount } from "@/lib/finance/validate";

export type GoalState = { error?: string; ok?: number };

export async function createGoal(_prev: GoalState, fd: FormData): Promise<GoalState> {
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Назовите цель" };
  const target = parseAmount(String(fd.get("target") ?? ""));
  if (!target.ok) return { error: target.error };
  const sb = await createServerClient();
  const { error } = await sb.from("goals").insert({ name, target: target.value });
  if (error) return { error: "Не удалось сохранить" };
  revalidatePath("/goals");
  return { ok: Date.now() };
}

export async function topUpGoal(_prev: GoalState, fd: FormData): Promise<GoalState> {
  const id = String(fd.get("id") ?? "");
  const amount = parseAmount(String(fd.get("amount") ?? ""));
  if (!amount.ok) return { error: amount.error };
  const sb = await createServerClient();
  const { data, error } = await sb.from("goals").select("saved").eq("id", id).single();
  if (error) return { error: "Цель не найдена" };
  const up = await sb.from("goals").update({ saved: Number(data.saved) + amount.value }).eq("id", id);
  if (up.error) return { error: "Не удалось сохранить" };
  revalidatePath("/goals");
  return { ok: Date.now() };
}

export async function deleteGoal(id: string) {
  const sb = await createServerClient();
  await sb.from("goals").delete().eq("id", id);
  revalidatePath("/goals");
}
