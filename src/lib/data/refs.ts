import { createServerClient } from "@/lib/supabase/server";
import type { Store } from "@/lib/finance/types";

export type Category = { id: string; scope: "business" | "personal"; kind: "income" | "expense"; name: string };

export async function getStores(): Promise<Store[]> {
  const sb = await createServerClient();
  const { data, error } = await sb.from("stores").select("id,name,sort_order").order("sort_order");
  if (error) throw error;
  return (data ?? []).map((s) => ({ id: s.id, name: s.name, sortOrder: s.sort_order }));
}

export async function getCategories(scope?: Category["scope"]): Promise<Category[]> {
  const sb = await createServerClient();
  let q = sb.from("categories").select("id,scope,kind,name").order("name");
  if (scope) q = q.eq("scope", scope);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function getTaxRate(): Promise<number> {
  const sb = await createServerClient();
  const { data } = await sb.from("settings").select("tax_rate").maybeSingle();
  return data ? Number(data.tax_rate) : 0.02;
}
