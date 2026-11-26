"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; ok?: number };

export async function saveTaxRate(_prev: SettingsState, fd: FormData): Promise<SettingsState> {
  const raw = String(fd.get("tax_percent") ?? "").replace(",", ".").trim();
  const pct = Number(raw);
  if (raw === "" || !Number.isFinite(pct) || pct < 0 || pct > 20) return { error: "Ставка от 0 до 20%" };
  const sb = await createServerClient();
  const { data: auth } = await sb.auth.getUser();
  const { error } = await sb.from("settings").upsert({ user_id: auth.user!.id, tax_rate: Math.round(pct * 100) / 10000 });
  if (error) return { error: "Не удалось сохранить" };
  revalidatePath("/", "layout");
  return { ok: Date.now() };
}

export async function addCategory(_prev: SettingsState, fd: FormData): Promise<SettingsState> {
  const name = String(fd.get("name") ?? "").trim();
  const [scope, kind] = String(fd.get("group") ?? "").split(":");
  if (!name) return { error: "Введите название" };
  if (!["business", "personal"].includes(scope) || !["income", "expense"].includes(kind)) return { error: "Выберите раздел" };
  const sb = await createServerClient();
  const { error } = await sb.from("categories").insert({ scope, kind, name });
  if (error) return { error: error.code === "23505" ? "Такая категория уже есть" : "Не удалось сохранить" };
  revalidatePath("/", "layout");
  return { ok: Date.now() };
}

const SYSTEM_CATEGORY = "Из бизнеса";

async function isSystem(sb: Awaited<ReturnType<typeof createServerClient>>, id: string) {
  const { data } = await sb.from("categories").select("name,scope,kind").eq("id", id).maybeSingle();
  return data?.name === SYSTEM_CATEGORY && data.scope === "personal" && data.kind === "income";
}

export async function renameCategory(id: string, name: string): Promise<{ error?: string }> {
  const n = name.trim();
  if (!n) return { error: "Пустое название" };
  const sb = await createServerClient();
  if (await isSystem(sb, id)) return { error: "Эту категорию использует «вывод в личное» — её нельзя менять" };
  const { error } = await sb.from("categories").update({ name: n }).eq("id", id);
  if (error) return { error: error.code === "23505" ? "Такая категория уже есть" : "Не удалось сохранить" };
  revalidatePath("/", "layout");
  return {};
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  const sb = await createServerClient();
  if (await isSystem(sb, id)) return { error: "Эту категорию использует «вывод в личное» — её нельзя удалить" };
  const { error } = await sb.from("categories").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") return { error: "В этой категории есть операции — сначала перенесите или удалите их" };
    return { error: "Не удалось удалить" };
  }
  revalidatePath("/", "layout");
  return {};
}
