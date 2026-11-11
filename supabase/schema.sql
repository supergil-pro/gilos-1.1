-- GILOS: מבנה מסד הנתונים ב-Supabase.
-- מריצים פעם אחת: Supabase > SQL Editor > New query > מדביקים את כל הקובץ > Run.
-- בטוח להריץ שוב: כל פקודה בודקת אם הדבר כבר קיים.

-- ---------- טבלאות ----------

-- חשבון: אחד לכל משתמש. מחזיק את היצירות שנותרו (משותפות לכל הפרופילים).
create table if not exists public.accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  credits integer not null default 20 check (credits >= 0),
  created_at timestamptz not null default now()
);

-- פרופיל: כמה לכל משתמש (עסק נוסף וכו'). ההגדרות, השאלון, ההאשטגים ולוח התוכן נשמרים ב-data.
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_user_id_idx on public.profiles (user_id);

-- ---------- הרשאות (RLS): כל משתמש רואה ומשנה רק את הנתונים שלו ----------

alter table public.accounts enable row level security;
alter table public.profiles enable row level security;

-- את החשבון אפשר רק לקרוא. היצירות יורדות רק דרך הפונקציה use_credit שלמטה,
-- כדי שמשתמש לא יוכל להגדיל לעצמו את המספר.
drop policy if exists "accounts: read own" on public.accounts;
create policy "accounts: read own" on public.accounts
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "profiles: delete own" on public.profiles;
create policy "profiles: delete own" on public.profiles
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- משתמש חדש: יוצרים לו חשבון ופרופיל ראשון בשמו ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.accounts (user_id) values (new.id);
  insert into public.profiles (user_id, name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)), 80)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- שימוש ביצירה: מוריד אחת ומחזיר כמה נשארו ----------

create or replace function public.use_credit()
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  remaining integer;
begin
  update public.accounts
     set credits = credits - 1
   where user_id = auth.uid() and credits > 0
  returning credits into remaining;
  if remaining is null then
    raise exception 'no_credits';
  end if;
  return remaining;
end;
$$;

revoke execute on function public.use_credit() from public, anon;
grant execute on function public.use_credit() to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
