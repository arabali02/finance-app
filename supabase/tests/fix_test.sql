\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
select seed_defaults();

-- магазины уникальны по имени
do $$ begin
  begin
    insert into stores (name, sort_order) values ('KEMEL', 5);
    raise exception 'duplicate store accepted';
  exception when unique_violation then null;
  end;
end $$;

-- period_totals: суммы считаются в базе, без лимита в 1000 строк
insert into expenses (store_id, date, category_id, amount)
  select null, date '2026-01-01' + (g % 300), (select id from categories where scope='business' and name='Реклама'), 10
  from generate_series(1, 1500) g;
insert into day_sales (store_id, date, kaspi, cash, terminal, cogs)
  select s.id, date '2026-01-01' + g, 100, 0, 0, 40 from stores s, generate_series(0, 599) g;
do $$
declare r jsonb := period_totals('2026-01-01', '2027-12-31');
begin
  assert (select sum((e->>'amount')::bigint) from jsonb_array_elements(r->'expenses') e) = 15000, 'expenses sum ' || (r->'expenses')::text;
  assert (select sum((s->>'kaspi')::bigint) from jsonb_array_elements(r->'sales') s) = 120000, 'sales sum';
  assert jsonb_array_length(r->'sales') = 2, 'sales grouped by store';
end $$;

-- вывод в личное: создание, правка, правка при потерянной связи, удаление — синхронно
do $$
declare d uuid; p uuid; kem uuid := (select id from stores where name='KEMEL');
begin
  d := save_owner_draw(null, kem, '2026-11-26', 50000, null);
  p := (select personal_txn_id from owner_draws where id = d);
  assert (select amount from personal_txns where id = p) = 50000, 'create';
  perform save_owner_draw(d, kem, '2026-11-27', 80000, 'x');
  assert (select amount from personal_txns where id = p) = 80000, 'edit amount';
  assert (select date from personal_txns where id = p) = '2026-11-27', 'edit date';
  delete from personal_txns where id = p;               -- связь потеряна (set null)
  perform save_owner_draw(d, kem, '2026-11-27', 90000, null);
  assert (select amount from personal_txns where id = (select personal_txn_id from owner_draws where id = d)) = 90000, 'relink';
  p := (select personal_txn_id from owner_draws where id = d);
  perform delete_owner_draw(d);
  assert not exists (select 1 from owner_draws where id = d), 'draw deleted';
  assert not exists (select 1 from personal_txns where id = p), 'personal deleted';
end $$;
select 'ALL FIX TESTS PASSED';
