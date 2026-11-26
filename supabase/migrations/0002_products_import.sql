-- Товары из кассовой программы и загрузка отчётов о продажах.

-- Смешанная оплата (наличные + Kaspi одной продажей) и источник итога дня.
alter table public.day_sales add column if not exists mixed bigint not null default 0 check (mixed >= 0);
alter table public.day_sales add column if not exists source text not null default 'manual' check (source in ('manual', 'import'));

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  article text not null default '',
  barcode text not null,
  name text not null,
  color text not null default '',
  size text not null default '',
  qty numeric(12, 2) not null default 0,
  cost bigint not null default 0 check (cost >= 0),
  price bigint not null default 0 check (price >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, store_id, barcode)
);
create index if not exists products_store_idx on public.products (user_id, store_id);

alter table public.products enable row level security;
drop policy if exists own_rows on public.products;
create policy own_rows on public.products for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.products to authenticated;

-- Итоги за период: смешанная оплата входит в выручку.
create or replace function public.period_totals(p_from date, p_to date)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'sales', coalesce((
      select jsonb_agg(jsonb_build_object('store_id', store_id, 'kaspi', kaspi, 'cash', cash, 'terminal', terminal, 'mixed', mixed, 'cogs', cogs))
      from (select store_id, sum(kaspi) kaspi, sum(cash) cash, sum(terminal) terminal, sum(mixed) mixed, sum(cogs) cogs
            from day_sales where date between p_from and p_to group by store_id) s), '[]'::jsonb),
    'expenses', coalesce((
      select jsonb_agg(jsonb_build_object('store_id', store_id, 'category_id', category_id, 'amount', amount))
      from (select store_id, category_id, sum(amount) amount
            from expenses where date between p_from and p_to group by store_id, category_id) e), '[]'::jsonb),
    'purchases', (select coalesce(sum(amount), 0) from purchases where date between p_from and p_to),
    'draws', (select coalesce(sum(amount), 0) from owner_draws where date between p_from and p_to)
  );
$$;
