-- ============================================================
-- Focus Check — схема базы для Supabase (версия 2.0).
-- ============================================================
-- Как применить: Supabase → SQL Editor → New query → вставить весь файл → Run.
--
-- Принципы:
--  • Таблицы и колонки называются так же, как поля в js/models.js —
--    поэтому данные из браузера переносятся без переделки.
--  • В каждой таблице есть user_id. По умолчанию он заполняется
--    автоматически: default auth.uid() (id того, кто вошёл).
--  • Row Level Security (RLS) включён везде: каждая запись видна
--    и доступна ТОЛЬКО её владельцу. Без этого публичный ключ
--    в коде страницы давал бы доступ ко всем данным.
--  • Время задачи хранится как текст 'ЧЧ:ММ' (а не тип time),
--    чтобы база не превращала '10:30' в '10:30:00'.

-- ---------- Профиль: настройки пользователя ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Задачи ----------
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  date        date,                                   -- null = «потом»
  time        text check (time is null or time ~ '^\d{2}:\d{2}$'),
  is_main     boolean not null default false,         -- главное дело дня
  status      text not null default 'todo' check (status in ('todo', 'done')),
  first_step  text not null default '',
  finish_line text not null default '',
  parent_id   uuid references public.tasks (id) on delete cascade,  -- кусочек «слона» → id большого дела
  position    integer not null default 0,             -- порядок кусочков внутри «слона»
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  done_at     timestamptz
);
create index if not exists tasks_user_date_idx on public.tasks (user_id, date);
create index if not exists tasks_parent_idx on public.tasks (parent_id);
-- Вложенность — один уровень (у кусочка нет своих кусочков). Это правило соблюдает приложение (js/models.js).

-- ---------- Привычки ----------
create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  part        text not null default 'morning' check (part in ('morning', 'day', 'evening')),
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Отметки привычек (одна строка = привычка выполнена в этот день) ----------
create table if not exists public.habit_checks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id    uuid not null references public.habits (id) on delete cascade,
  date        date not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, habit_id, date)
);

-- ---------- Почасовой чек-лист ----------
create table if not exists public.hourly_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date        date not null,
  hour        smallint not null check (hour between 0 and 23),
  note        text not null default '',
  done        boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date, hour)
);

-- ---------- Фокус-сессии ----------
create table if not exists public.focus_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id     uuid references public.tasks (id) on delete set null,
  title       text not null default '',
  date        date not null,
  planned_min integer not null check (planned_min > 0),
  actual_min  integer not null check (actual_min >= 0),
  outcome     text not null check (outcome in ('done', 'progress', 'stopped')),
  started_at  timestamptz not null,
  ended_at    timestamptz not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists focus_user_date_idx on public.focus_sessions (user_id, date);

-- ---------- Заметки дня: уровень сил и «что получилось» ----------
create table if not exists public.day_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date        date not null,
  energy      text check (energy in ('low', 'mid', 'high')),
  win_note    text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);

-- ---------- Параллельные дела (стирка, программа, лекция) ----------
create table if not exists public.runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id     uuid references public.tasks (id) on delete set null,
  title       text not null check (char_length(title) between 1 and 120),
  emoji       text not null default '⏳',
  minutes     integer check (minutes is null or minutes > 0),   -- null = без таймера
  after_text  text not null default '',                        -- что сделать, когда закончится
  started_at  timestamptz not null,
  ends_at     timestamptz,
  status      text not null default 'running' check (status in ('running', 'ringing', 'done', 'stopped')),
  finished_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists runs_user_status_idx on public.runs (user_id, status);

-- ============================================================
-- Row Level Security: «каждый видит только своё»
-- ============================================================
alter table public.profiles       enable row level security;
alter table public.tasks          enable row level security;
alter table public.habits         enable row level security;
alter table public.habit_checks   enable row level security;
alter table public.hourly_entries enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.day_notes      enable row level security;
alter table public.runs           enable row level security;

-- Профиль: id профиля = id пользователя.
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Остальные таблицы: одно правило на все операции (чтение, вставка, изменение, удаление).
-- using      — какие строки можно видеть/менять;
-- with check — какие строки можно записать (нельзя подставить чужой user_id).
do $$
declare t text;
begin
  foreach t in array array['tasks', 'habits', 'habit_checks', 'hourly_entries', 'focus_sessions', 'day_notes', 'runs']
  loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- Права для вошедших пользователей (сами строки всё равно фильтрует RLS).
-- Анонимным посетителям (role anon) доступ не даём вовсе.
grant select, insert, update, delete on
  public.profiles, public.tasks, public.habits, public.habit_checks,
  public.hourly_entries, public.focus_sessions, public.day_notes, public.runs
to authenticated;

-- ============================================================
-- Проверка после применения (запускать по одной строке):
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';
--   → у всех 8 таблиц rowsecurity = true
-- ============================================================
