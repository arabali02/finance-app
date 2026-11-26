import { createBrowserClient as createSsrBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export function createBrowserClient() {
  return createSsrBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
