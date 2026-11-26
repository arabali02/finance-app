# Как запустить сайт (бесплатно, ~15 минут)

## 1. База данных — Supabase
1. Зарегистрируйтесь на https://supabase.com → **New project**. Регион — Frankfurt (ближе к Казахстану). Пароль базы сохраните.
2. Слева **SQL Editor** → **New query** → вставьте всё содержимое файла `supabase/migrations/0001_init.sql` → **Run**. Должно быть «Success».
3. Слева **Authentication** → **Users** → **Add user** → **Create new user**: ваш email и пароль, галочка **Auto Confirm User**. Этим email и паролем вы будете входить на сайт.
4. **Authentication** → **Sign In / Providers** → выключите **Allow new users to sign up** — чтобы посторонние не могли зарегистрироваться.
5. **Project Settings** → **API** (или **Data API**): скопируйте **Project URL** и ключ **anon public**.

## 2. Сайт — Vercel
1. Зайдите на https://vercel.com через GitHub → **Add New → Project** → выберите репозиторий `finance-app` → **Import**.
2. В **Environment Variables** добавьте:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public ключ
3. **Deploy**. Через 1–2 минуты получите ссылку вида `finance-app-xxx.vercel.app`.

## 3. Первый вход
Откройте ссылку, войдите своим email и паролем. Магазины KEMEL и JARYQ и категории создадутся автоматически.

На телефоне: откройте сайт в браузере → «Поделиться» → **На экран «Домой»** — будет как приложение.

## Для разработчика
```bash
npm install
cp .env.example .env.local   # вписать URL и ключ
npm run dev                  # http://localhost:3000
npm test                     # unit-тесты расчётов
npm run test:db              # проверка миграции и RLS на локальном Postgres 16
```
