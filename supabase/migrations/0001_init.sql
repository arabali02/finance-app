-- Финансы KEMEL / JARYQ: схема v1
-- Все суммы — целые тенге. Все таблицы закрыты RLS: строки видит только владелец.

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  scope text not null check (scope in ('business', 'personal')),
  kind text not null check (kind in ('income', 'expense')),
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, scope, kind, name)
);

create table public.day_sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  date date not null,
  kaspi bigint not null default 0 check (kaspi >= 0),
  cash bigint not null default 0 check (cash >= 0),
  terminal bigint not null default 0 check (terminal >= 0),
  cogs bigint not null default 0 check (cogs >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, store_id, date)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  store_id uuid references public.stores (id) on delete restrict,
  date date not null,
  category_id uuid not null references public.categories (id) on delete restrict,
  amount bigint not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  date date not null,
  amount bigint not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

create table public.personal_txns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  date date not null,
  kind text not null check (kind in ('income', 'expense')),
  category_id uuid not null references public.categories (id) on delete restrict,
  amount bigint not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

create table public.owner_draws (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  store_id uuid references public.stores (id) on delete restrict,
  date date not null,
  amount bigint not null check (amount > 0),
  note text,
  personal_txn_id uuid references public.personal_txns (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  target bigint not null check (target > 0),
  saved bigint not null default 0 check (saved >= 0),
  created_at timestamptz not null default now()
);

create table public.settings (
  user_id uuid primary key default auth.uid(),
  tax_rate numeric(5, 4) not null default 0.02 check (tax_rate >= 0 and tax_rate <= 0.2)
);

create index on public.day_sales (user_id, date);
create index on public.expenses (user_id, date);
create index on public.purchases (user_id, date);
create index on public.owner_draws (user_id, date);
create index on public.personal_txns (user_id, date);

-- RLS: каждый видит и меняет только свои строки
do $$
declare t text;
begin
  foreach t in array array['stores','categories','day_sales','expenses','purchases','personal_txns','owner_draws','goals','settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy own_rows on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t);
  end loop;
end $$;

-- Начальные данные для текущего пользователя. Повторный вызов ничего не дублирует.
create or replace function public.seed_defaults()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (select 1 from stores where user_id = uid) then
    insert into stores (user_id, name, sort_order) values (uid, 'KEMEL', 0), (uid, 'JARYQ', 1);
  end if;

  insert into categories (user_id, scope, kind, name)
  select uid, v.scope, v.kind, v.name
  from (values
    ('business', 'expense', 'Аренда и коммуналка'),
    ('business', 'expense', 'Зарплата'),
    ('business', 'expense', 'Реклама'),
    ('business', 'expense', 'Доставка товара'),
    ('business', 'expense', 'Прочее'),
    ('personal', 'expense', 'Еда'),
    ('personal', 'expense', 'Транспорт'),
    ('personal', 'expense', 'Дом'),
    ('personal', 'expense', 'Прочее'),
    ('personal', 'income', 'Из бизнеса'),
    ('personal', 'income', 'Прочее')
  ) as v(scope, kind, name)
  where not exists (select 1 from categories c where c.user_id = uid)
  on conflict do nothing;

  insert into settings (user_id) values (uid) on conflict do nothing;
end;
$$;

grant execute on function public.seed_defaults() to authenticated;
