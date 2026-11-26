\set ON_ERROR_STOP on
set role authenticated;
-- пользователь 1
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select seed_defaults();
select seed_defaults(); -- повтор не дублирует
do $$ begin
  assert (select count(*) from stores) = 2, 'stores';
  assert (select count(*) from categories) = 11, 'categories';
  assert (select tax_rate from settings) = 0.02, 'tax';
end $$;
insert into day_sales (store_id, date, kaspi, cash, terminal, cogs)
  select id, '2026-11-26', 100, 50, 0, 60 from stores where name = 'KEMEL';
-- повтор итога дня — upsert, не дубль
insert into day_sales (store_id, date, kaspi, cash, terminal, cogs)
  select id, '2026-11-26', 200, 0, 0, 90 from stores where name = 'KEMEL'
  on conflict (user_id, store_id, date) do update set kaspi = excluded.kaspi, cash = excluded.cash, terminal = excluded.terminal, cogs = excluded.cogs;
do $$ begin
  assert (select count(*) from day_sales) = 1, 'upsert count';
  assert (select kaspi from day_sales) = 200, 'upsert value';
end $$;
-- сумма 0 в расходе отклоняется
do $$ begin
  begin
    insert into expenses (store_id, date, category_id, amount)
      select null, '2026-11-26', id, 0 from categories limit 1;
    raise exception 'zero amount accepted';
  exception when check_violation then null;
  end;
end $$;
-- пользователь 2 не видит данных пользователя 1
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin
  assert (select count(*) from stores) = 0, 'rls stores';
  assert (select count(*) from day_sales) = 0, 'rls sales';
end $$;
-- и не может записать от чужого имени
do $$ begin
  begin
    insert into goals (user_id, name, target) values ('11111111-1111-1111-1111-111111111111', 'x', 1);
    raise exception 'foreign insert accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
select 'ALL RLS TESTS PASSED';
