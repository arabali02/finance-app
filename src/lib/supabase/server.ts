import { createServerClient as createSsrClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { cookies } from "next/headers";

export async function createServerClient() {
  const cookieStore = await cookies();
  return createSsrClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Вызов из server component: куки обновит middleware.
        }
      },
    },
  });
}
