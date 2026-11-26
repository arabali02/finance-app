# Finance App v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Веб-сайт учёта финансов KEMEL и JARYQ с чистой прибылью, личным бюджетом, целями и Excel-выгрузкой.

**Architecture:** Next.js App Router (server components + server actions) поверх Supabase (Postgres + Auth, RLS по `user_id`). Вся математика прибыли — чистые функции в `src/lib/finance/` с unit-тестами; страницы только читают данные и вызывают эти функции.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, @supabase/ssr + @supabase/supabase-js, Recharts, SheetJS (`xlsx`), Vitest, Playwright (smoke).

**Spec:** `docs/superpowers/specs/2026-11-26-finance-app-design.md`

## Global Constraints
- Язык интерфейса — русский; валюта — тенге, формат `1 234 567 ₸`.
- Деньги — целые тенге (`integer`/`bigint` в БД, `number` целые в TS). Никаких дробей в суммах.
- Ставка налога по умолчанию `0.02`, настраивается; налог = выручка × ставка, округление `Math.round` по магазину.
- Чистая прибыль = выручка − себестоимость − операционные расходы − налог. Закупка товара и вывод в личное **не** уменьшают прибыль.
- Общий расход (`store_id = null`) делится между магазинами поровну; остаток от деления — первому магазину по `sort_order`.
- Один пользователь, вход email+пароль; все таблицы с RLS `user_id = auth.uid()`.
- «Сегодня» и границы периодов — по часовому поясу `Asia/Qyzylorda`; даты хранятся как `date` (`YYYY-MM-DD`).
- Мобильная вёрстка от 360px, без горизонтального скролла; одинаково удобно на компьютере.
- Бюджет 0 ₸: только бесплатные тарифы Supabase и Vercel.

## Review Focus
- Повторный ввод итога дня для того же магазина и даты → обновляет существующую запись (upsert), а не создаёт дубль и не удваивает выручку. Тест в Task 4.
- Сумма ≤ 0, пустая или нечисловая → форма показывает ошибку, ничего не сохраняет. Тест в Task 4.
- Себестоимость больше выручки → прибыль отрицательная и показана красным, не обнуляется. Тест в Task 1.
- Пустой период (нет записей) → нули, не `NaN`/пусто. Тест в Task 1.
- Запись в 23:30 по Кызылорде попадает в текущий день, а не в следующий (UTC). Тест в Task 1 (`todayLocal`).

---

### Task 1: Каркас проекта и расчёт прибыли

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind` конфиг, `vitest.config.ts`, `src/app/layout.tsx` (lang="ru")
- Create: `src/lib/finance/types.ts`, `src/lib/finance/profit.ts`, `src/lib/finance/format.ts`, `src/lib/finance/dates.ts`
- Test: `src/lib/finance/profit.test.ts`, `src/lib/finance/format.test.ts`, `src/lib/finance/dates.test.ts`

**Interfaces:**
- Produces:
  - `type Store = { id: string; name: string; sortOrder: number }`
  - `type DaySale = { storeId: string; date: string; kaspi: number; cash: number; terminal: number; cogs: number }`
  - `type Expense = { storeId: string | null; date: string; categoryId: string; amount: number }`
  - `type StoreProfit = { storeId: string; revenue: number; cogs: number; opex: number; tax: number; net: number }`
  - `computeProfit(input: { stores: Store[]; sales: DaySale[]; expenses: Expense[]; taxRate: number }): { byStore: StoreProfit[]; total: Omit<StoreProfit,'storeId'> }`
  - `expensesByCategory(expenses: Expense[]): Record<string, number>`
  - `formatTenge(n: number): string` → `"1 234 567 ₸"` (неразрывные пробелы), отрицательные с `−`
  - `todayLocal(now?: Date): string` (YYYY-MM-DD в Asia/Qyzylorda); `periodRange(kind: 'day'|'week'|'month', ref: string): { from: string; to: string }` (неделя с понедельника)

- [ ] **Step 1:** `npx create-next-app@15 . --ts --tailwind --app --src-dir --eslint --no-turbopack --import-alias "@/*"`, добавить `vitest`, скрипт `"test": "vitest run"`. Запуск: `npm run build` → успешно.
- [ ] **Step 2: Тесты `profit.test.ts`:**
  - 2 магазина (A sort 0, B sort 1), продажи A: kaspi 100000, cash 50000, terminal 0, cogs 60000; расход A 20000; общий расход 10001; taxRate 0.02 → A: revenue 150000, tax 3000, opex 25001, net 61999; B: revenue 0, opex 5000, tax 0, net −5000; total.net 56999.
  - cogs 200000 при выручке 150000 → net отрицательный (−… точно посчитать в тесте).
  - пустые sales/expenses → все поля 0, `Number.isNaN` нигде.
  - `expensesByCategory` суммирует по categoryId.
- [ ] **Step 3:** Тесты `format.test.ts` (`formatTenge(1234567)` → `"1 234 567 ₸"`, `formatTenge(-500)` → `"−500 ₸"`) и `dates.test.ts` (`todayLocal(new Date('2026-11-26T18:30:00Z'))` → `"2026-11-26"`; `todayLocal(new Date('2026-11-26T19:30:00Z'))` → `"2026-11-27"`; `periodRange('week','2026-11-26')` → `{from:'2026-11-23',to:'2026-11-29'}`; `periodRange('month','2026-02-10')` → `{from:'2026-02-01',to:'2026-02-28'}`).
- [ ] **Step 4:** `npm test` → FAIL.
- [ ] **Step 5:** Реализовать функции. Часовой пояс — через `Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qyzylorda'})`.
- [ ] **Step 6:** `npm test` → PASS. Коммит `feat: scaffold and profit calculation`.

### Task 2: База данных Supabase

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `.env.example`

**Interfaces:**
- Produces таблицы (все с `id uuid default gen_random_uuid()`, `user_id uuid not null default auth.uid()`, `created_at`, RLS `user_id = auth.uid()` на select/insert/update/delete):
  - `stores(name text, sort_order int)`
  - `categories(scope text check in ('business','personal'), kind text check in ('income','expense'), name text)`
  - `day_sales(store_id uuid fk, date date, kaspi bigint, cash bigint, terminal bigint, cogs bigint, unique(user_id, store_id, date))`, все суммы `check >= 0`
  - `expenses(store_id uuid null fk, date date, category_id uuid fk, amount bigint check > 0, note text)`
  - `purchases(store_id uuid fk, date date, amount bigint check > 0, note text)`
  - `owner_draws(store_id uuid null fk, date date, amount bigint check > 0, note text)`
  - `personal_txns(date date, kind text check in ('income','expense'), category_id uuid fk, amount bigint check > 0, note text)`
  - `goals(name text, target bigint check > 0, saved bigint default 0)`
  - `settings(user_id uuid pk, tax_rate numeric default 0.02)`
  - функция `seed_defaults()` (security invoker): создаёт магазины KEMEL (0), JARYQ (1); бизнес-категории «Аренда и коммуналка», «Зарплата», «Реклама», «Доставка товара», «Прочее»; личные расходы «Еда», «Транспорт», «Дом», «Прочее»; личные доходы «Из бизнеса», «Прочее»; строку settings. Идемпотентна.
- `createServerClient()` / `createBrowserClient()` из `@supabase/ssr`; env `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

- [ ] **Step 1:** Написать миграцию. Проверка: `npx supabase db lint` или применение к локальному Postgres (`psql -f`) без ошибок (auth.uid() заглушить схемой `auth` в тестовой БД).
- [ ] **Step 2:** Клиенты Supabase и `.env.example`. `npm run build` → успешно. Коммит `feat: database schema`.

### Task 3: Вход

**Files:**
- Create: `src/app/login/page.tsx`, `src/app/login/actions.ts`, `src/middleware.ts`, `src/app/(app)/layout.tsx` (нижнее меню на телефоне / боковое на компьютере: Главная, Операции, Отчёты, Личное, Цели, Настройки)

**Interfaces:**
- Produces: `signIn(formData)` → redirect `/`; `signOut()`; middleware редиректит неавторизованных на `/login`. После первого входа вызывается `rpc('seed_defaults')`.

- [ ] **Step 1:** Реализовать. Проверка: Playwright-smoke `tests/e2e/auth.spec.ts` — без сессии `/` → `/login`. Коммит `feat: auth`.

### Task 4: Быстрый ввод

**Files:**
- Create: `src/lib/finance/validate.ts`, `src/app/(app)/add/page.tsx`, `src/app/(app)/add/actions.ts`
- Test: `src/lib/finance/validate.test.ts`

**Interfaces:**
- Consumes: таблицы Task 2, `todayLocal`.
- Produces: `parseAmount(raw: string): { ok: true; value: number } | { ok: false; error: string }` (принимает `"12 500"`, `"12500"`; отклоняет `""`, `"abc"`, `"0"`, `"-5"`, `"1.5"` с ошибкой «Введите сумму больше нуля»; для полей итога дня — `parseAmount(raw, { allowZero: true })`).
- Server actions: `saveDaySale(fd)` — upsert по `(user_id, store_id, date)`; `saveExpense(fd)`, `savePurchase(fd)`, `saveOwnerDraw(fd)` (вывод также создаёт `personal_txns` income «Из бизнеса»).

- [ ] **Step 1:** Тесты `validate.test.ts` на перечисленные входы. `npm test` → FAIL.
- [ ] **Step 2:** Реализовать `parseAmount` → PASS.
- [ ] **Step 3:** Страница: переключатель типа (Итог дня / Расход / Закупка / В личное), выбор магазина кнопками (для расхода и «в личное» + «Общий»), дата (по умолчанию сегодня), поля сумм с `inputmode="numeric"`, кнопка «Сохранить». Итог дня показывает живую сумму выручки.
- [ ] **Step 4:** Playwright `tests/e2e/add.spec.ts` (с тестовым пользователем из env): сохранить итог дня дважды для одной даты → в списке одна запись со вторыми суммами; сумма `0` в расходе → текст ошибки, запись не создана. Коммит `feat: quick entry`.

### Task 5: Главная

**Files:** Create: `src/app/(app)/page.tsx`, `src/lib/data/loadPeriod.ts`

**Interfaces:**
- Produces: `loadPeriod(from: string, to: string): Promise<{ stores: Store[]; sales: DaySale[]; expenses: Expense[]; purchasesTotal: number; drawsTotal: number; taxRate: number }>`

- [ ] **Step 1:** Карточки «Сегодня» и «Этот месяц»: чистая прибыль общая (крупно, красная если < 0) + по KEMEL и JARYQ; строка «Деньги: закуплено товара X ₸, выведено в личное Y ₸»; плавающая кнопка «+» → `/add`. Проверка: `npm run build`, ручной просмотр 360px. Коммит `feat: dashboard`.

### Task 6: Операции

**Files:** Create: `src/app/(app)/operations/page.tsx`, `src/app/(app)/operations/actions.ts`

- [ ] **Step 1:** Список за выбранный месяц, сгруппирован по датам, фильтр по магазину и типу; редактирование (переход на `/add?edit=<type>:<id>` с заполненной формой) и удаление с подтверждением. Коммит `feat: operations list`.

### Task 7: Отчёты и Excel

**Files:** Create: `src/app/(app)/reports/page.tsx`, `src/lib/finance/excel.ts`; Test: `src/lib/finance/excel.test.ts`

**Interfaces:**
- Consumes: `computeProfit`, `expensesByCategory`, `loadPeriod`.
- Produces: `buildReportWorkbook(data: { period: {from:string;to:string}; profit: ReturnType<typeof computeProfit>; byCategory: {name:string;amount:number}[]; storeNames: Record<string,string> }): XLSX.WorkBook` — листы «Прибыль» (строки: Выручка, Себестоимость, Расходы, Налог, Чистая прибыль; колонки: KEMEL, JARYQ, Итого) и «Расходы по категориям».

- [ ] **Step 1:** Тест: книга имеет листы `["Прибыль","Расходы по категориям"]`, ячейка «Чистая прибыль / Итого» = `total.net`. FAIL → реализовать → PASS.
- [ ] **Step 2:** Страница: выбор периода (день/неделя/месяц/свой), таблица прибыли, круговая диаграмма расходов по категориям и столбики KEMEL vs JARYQ (Recharts), кнопка «Скачать Excel» (`XLSX.writeFile`, имя `otchet_<from>_<to>.xlsx`). Коммит `feat: reports and excel export`.

### Task 8: Личный бюджет

**Files:** Create: `src/app/(app)/personal/page.tsx`, `src/app/(app)/personal/actions.ts`

- [ ] **Step 1:** За месяц: доходы, расходы, остаток; расходы по категориям; форма добавления (доход/расход, категория, сумма через `parseAmount`, дата); список с удалением. Коммит `feat: personal budget`.

### Task 9: Цели

**Files:** Create: `src/app/(app)/goals/page.tsx`, `src/app/(app)/goals/actions.ts`, `src/lib/finance/goals.ts`; Test: `src/lib/finance/goals.test.ts`

**Interfaces:**
- Produces: `goalProgress(saved: number, target: number): number` (0–100, целое, не больше 100).

- [ ] **Step 1:** Тесты: `(0,100)`→0, `(50,200)`→25, `(300,200)`→100. FAIL → реализовать → PASS.
- [ ] **Step 2:** Страница: создать цель, «Пополнить» (сумма прибавляется к `saved`), прогресс-бар, «осталось X ₸». Коммит `feat: goals`.

### Task 10: Настройки и деплой

**Files:** Create: `src/app/(app)/settings/page.tsx`, `src/app/(app)/settings/actions.ts`, `docs/DEPLOY.md`

- [ ] **Step 1:** Настройки: ставка налога в % (0–20, сохраняется как доля), добавить/переименовать/удалить категории (удаление запрещено, если есть операции — сообщение), выход.
- [ ] **Step 2:** `docs/DEPLOY.md` на русском: создать проект Supabase → SQL Editor → вставить миграцию → создать пользователя в Authentication → Vercel → импорт репозитория → env-переменные → Deploy.
- [ ] **Step 3:** `npm test && npm run build` → всё зелёное. Коммит `feat: settings and deploy guide`.
