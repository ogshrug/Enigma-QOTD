-- Run this whole file in the Supabase SQL editor (Dashboard -> SQL -> New query).
-- Safe to run again as a migration (uses IF NOT EXISTS everywhere).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  avatar_url text,
  role text not null check (role in ('admin', 'player')),
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  question_date date not null default current_date,
  keywords text[] not null default '{}',
  answer_phrase text not null default '',
  answer_parts jsonb not null default '[]',
  points int not null default 1 check (points > 0),
  image_url text not null default '',
  media_type text not null default 'none' check (media_type in ('none', 'video', 'audio')),
  media_url text not null default '',
  hints text[] not null default '{}',
  explanation text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  answer_text text not null,
  score int check (score in (0, 1)),
  status text not null default 'pending' check (status in ('pending', 'graded')),
  auto_matched boolean not null default false,
  points_earned int,
  graded_by uuid references public.profiles(id),
  graded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (question_id, profile_id)
);

-- Add the new columns if upgrading an existing database.
alter table public.questions add column if not exists answer_phrase text not null default '';
alter table public.questions add column if not exists answer_parts jsonb not null default '[]';
alter table public.questions add column if not exists points int not null default 1 check (points > 0);
alter table public.questions add column if not exists image_url text not null default '';
alter table public.questions add column if not exists media_type text not null default 'none' check (media_type in ('none', 'video', 'audio'));
alter table public.questions add column if not exists media_url text not null default '';
alter table public.questions add column if not exists hints text[] not null default '{}';
alter table public.answers add column if not exists points_earned int;

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Auto-grading: runs on every answer insert.
-- An answer earns FULL points only when every answer part's text appears in it
-- (case/punctuation-insensitive substring match). If even one part is missing —
-- or nothing matches — the answer is flagged "pending" (Uncertain) for manual
-- review in the Grade screen. No partial points are auto-awarded.
create or replace function public.auto_grade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  q record;
  k text;
  p jsonb;
  norm text;
  norm_k text;
  part_text text;
  total_parts int := 0;
  matched_parts int := 0;
  full_points int := 0;
begin
  select id, keywords, answer_phrase, answer_parts, points into q
  from public.questions
  where id = new.question_id;
  if not found then
    raise exception 'question not found';
  end if;

  norm := lower(regexp_replace(new.answer_text, E'[^a-zA-Z0-9\\s]', '', 'g'));

  if q.answer_parts is not null and jsonb_typeof(q.answer_parts) = 'array'
     and jsonb_array_length(q.answer_parts) > 0 then
    for p in select jsonb_array_elements(q.answer_parts) loop
      part_text := p->>'text';
      total_parts := total_parts + 1;
      full_points := full_points + coalesce(nullif(p->>'points', '')::int, 0);
      if part_text is not null then
        norm_k := lower(regexp_replace(part_text, E'[^a-zA-Z0-9\\s]', '', 'g'));
        if norm_k <> '' and position(norm_k in norm) > 0 then
          matched_parts := matched_parts + 1;
        end if;
      end if;
    end loop;

    if total_parts > 0 and matched_parts = total_parts then
      new.score := 1;
      new.points_earned := full_points;
      new.status := 'graded';
      new.auto_matched := true;
    else
      new.score := null;
      new.points_earned := null;
      new.status := 'pending';
      new.auto_matched := false;
    end if;
    return new;
  end if;

  -- Legacy questions: single answer phrase / keywords.
  if q.answer_phrase is not null and btrim(q.answer_phrase) <> '' then
    norm_k := lower(regexp_replace(q.answer_phrase, E'[^a-zA-Z0-9\\s]', '', 'g'));
    if norm_k <> '' and position(norm_k in norm) > 0 then
      new.score := 1;
      new.points_earned := coalesce(q.points, 1);
      new.status := 'graded';
      new.auto_matched := true;
      return new;
    end if;
  elsif q.keywords is not null and cardinality(q.keywords) > 0 then
    foreach k in array q.keywords loop
      norm_k := lower(regexp_replace(k, E'[^a-zA-Z0-9\\s]', '', 'g'));
      if norm_k <> '' and position(norm_k in norm) > 0 then
        new.score := 1;
        new.points_earned := coalesce(q.points, 1);
        new.status := 'graded';
        new.auto_matched := true;
        return new;
      end if;
    end loop;
  end if;

  new.score := null;
  new.points_earned := null;
  new.status := 'pending';
  new.auto_matched := false;
  return new;
end;
$$;

drop trigger if exists answers_auto_grade on public.answers;
create trigger answers_auto_grade
  before insert on public.answers
  for each row execute function public.auto_grade();

-- Admin passphrase. Only the SECURITY DEFINER function below can read this
-- table; players can never see it (no RLS policies -> deny all).
create table if not exists public.admin_secrets (
  id int primary key default 1 check (id = 1),
  passphrase text not null
);

insert into public.admin_secrets (passphrase)
values ('headboyaarav')
on conflict (id) do nothing;

create or replace function public.create_admin_profile(passphrase text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  expected text;
begin
  if uid is null then
    raise exception 'you must be signed in';
  end if;

  select s.passphrase into expected from public.admin_secrets s where s.id = 1;
  if passphrase is distinct from expected then
    raise exception 'INCORRECT_PASSPHRASE';
  end if;

  if exists (select 1 from public.profiles where id = uid) then
    raise exception 'profile already exists';
  end if;

  insert into public.profiles (id, email, name, avatar_url, role)
  values (
    uid,
    auth.jwt() ->> 'email',
    auth.jwt() ->> 'name',
    auth.jwt() ->> 'picture',
    'admin'
  );

  return uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Media storage (images, video, audio)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "media_auth_upload" on storage.objects;
create policy "media_auth_upload" on storage.objects
  for insert with check (bucket_id = 'media' and auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.admin_secrets enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (auth.uid() = id and role = 'player');

drop policy if exists questions_select on public.questions;
create policy questions_select on public.questions
  for select using (auth.uid() is not null);

drop policy if exists questions_insert on public.questions;
create policy questions_insert on public.questions
  for insert with check (public.is_admin());

drop policy if exists questions_update on public.questions;
create policy questions_update on public.questions
  for update using (public.is_admin());

drop policy if exists questions_delete on public.questions;
create policy questions_delete on public.questions
  for delete using (public.is_admin());

drop policy if exists answers_select on public.answers;
create policy answers_select on public.answers
  for select using (auth.uid() = profile_id or public.is_admin());

drop policy if exists answers_insert on public.answers;
create policy answers_insert on public.answers
  for insert with check (auth.uid() = profile_id);

drop policy if exists answers_update on public.answers;
create policy answers_update on public.answers
  for update using (public.is_admin());

create index if not exists idx_answers_profile on public.answers(profile_id);
create index if not exists idx_answers_question on public.answers(question_id);
create index if not exists idx_questions_date on public.questions(question_date);