-- Финансы KEMEL / JARYQ: схема v1
-- Все суммы — целые тенге. Все таблицы закрыты RLS: строки видит только владелец.

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
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

-- Доступ к таблицам для вошедших пользователей (новые проекты Supabase не выдают его автоматически).
-- Какие именно строки видны — решает RLS ниже.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

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
    insert into stores (user_id, name, sort_order) values (uid, 'KEMEL', 0), (uid, 'JARYQ', 1)
    on conflict do nothing;
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

-- Итоги за период считаются в базе: без лимита API в 1000 строк.
create or replace function public.period_totals(p_from date, p_to date)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'sales', coalesce((
      select jsonb_agg(jsonb_build_object('store_id', store_id, 'kaspi', kaspi, 'cash', cash, 'terminal', terminal, 'cogs', cogs))
      from (select store_id, sum(kaspi) kaspi, sum(cash) cash, sum(terminal) terminal, sum(cogs) cogs
            from day_sales where date between p_from and p_to group by store_id) s), '[]'::jsonb),
    'expenses', coalesce((
      select jsonb_agg(jsonb_build_object('store_id', store_id, 'category_id', category_id, 'amount', amount))
      from (select store_id, category_id, sum(amount) amount
            from expenses where date between p_from and p_to group by store_id, category_id) e), '[]'::jsonb),
    'purchases', (select coalesce(sum(amount), 0) from purchases where date between p_from and p_to),
    'draws', (select coalesce(sum(amount), 0) from owner_draws where date between p_from and p_to)
  );
$$;

-- Вывод в личное: запись в бизнесе и доход в личном бюджете меняются в одной транзакции.
create or replace function public.save_owner_draw(p_id uuid, p_store uuid, p_date date, p_amount bigint, p_note text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  cat uuid;
  txn uuid;
  draw_id uuid := p_id;
begin
  select id into cat from categories
   where user_id = auth.uid() and scope = 'personal' and kind = 'income' and name = 'Из бизнеса';
  if cat is null then
    raise exception 'Нет личной категории «Из бизнеса»' using errcode = 'P0002';
  end if;

  if draw_id is null then
    insert into personal_txns (date, kind, category_id, amount, note)
      values (p_date, 'income', cat, p_amount, coalesce(p_note, 'Вывод из бизнеса')) returning id into txn;
    insert into owner_draws (store_id, date, amount, note, personal_txn_id)
      values (p_store, p_date, p_amount, p_note, txn) returning id into draw_id;
    return draw_id;
  end if;

  select personal_txn_id into txn from owner_draws where id = draw_id;
  if not found then
    raise exception 'Запись не найдена' using errcode = 'P0002';
  end if;
  if txn is not null then
    update personal_txns set date = p_date, amount = p_amount, note = coalesce(p_note, 'Вывод из бизнеса'), category_id = cat
     where id = txn;
    if not found then txn := null; end if;
  end if;
  if txn is null then
    insert into personal_txns (date, kind, category_id, amount, note)
      values (p_date, 'income', cat, p_amount, coalesce(p_note, 'Вывод из бизнеса')) returning id into txn;
  end if;
  update owner_draws set store_id = p_store, date = p_date, amount = p_amount, note = p_note, personal_txn_id = txn
   where id = draw_id;
  return draw_id;
end;
$$;

create or replace function public.delete_owner_draw(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare txn uuid;
begin
  delete from owner_draws where id = p_id returning personal_txn_id into txn;
  if txn is not null then
    delete from personal_txns where id = txn;
  end if;
end;
$$;

grant execute on function public.period_totals(date, date) to authenticated;
grant execute on function public.save_owner_draw(uuid, uuid, date, bigint, text) to authenticated;
grant execute on function public.delete_owner_draw(uuid) to authenticated;
