\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
select seed_defaults();
insert into products (store_id, article, barcode, name, size, qty, cost, price)
  select id, '0105336122', '2027550168120', 'Барсетка Kemel', '-', 1, 4200, 11900 from stores where name = 'KEMEL';
-- повторная загрузка того же штрихкода обновляет, а не дублирует
insert into products (store_id, article, barcode, name, size, qty, cost, price)
  select id, '0105336122', '2027550168120', 'Барсетка Kemel', '-', 3, 4300, 11900 from stores where name = 'KEMEL'
  on conflict (user_id, store_id, barcode) do update set qty = excluded.qty, cost = excluded.cost;
insert into day_sales (store_id, date, kaspi, cash, mixed, cogs, source)
  select id, '2026-11-01', 100, 50, 30, 70, 'import' from stores where name = 'KEMEL';
do $$
declare r jsonb := period_totals('2026-11-01', '2026-11-30');
begin
  assert (select count(*) from products) = 1, 'products upsert';
  assert (select cost from products) = 4300, 'products cost updated';
  assert (r->'sales'->0->>'mixed')::bigint = 30, 'mixed in totals';
end $$;
select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', false);
do $$ begin assert (select count(*) from products) = 0, 'rls products'; end $$;
select 'ALL PRODUCTS TESTS PASSED';
