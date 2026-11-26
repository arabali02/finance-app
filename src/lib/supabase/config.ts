// Публичные параметры проекта Supabase. Publishable-ключ виден в браузере любому посетителю —
// это нормально: данные защищены входом по паролю и правилами RLS в базе.
// Переменные окружения, если заданы (например, в Vercel), имеют приоритет.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://juffawslyjjdtfowgfks.supabase.co";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_6PmA1BTmzFZyaAKwxrrh2A_SxHkStqE";
