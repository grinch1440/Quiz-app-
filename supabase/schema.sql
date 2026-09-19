-- Quiz Master — Supabase schema
-- Run this FIRST in the Supabase SQL Editor, then run seed.sql.

create table if not exists categories (
  id text primary key,
  label text not null,
  icon text not null,
  color text not null,
  sort_order integer not null default 0
);

create table if not exists subtopics (
  id text primary key,
  category_id text not null references categories(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0
);

create table if not exists questions (
  id bigint generated always as identity primary key,
  subtopic_id text not null references subtopics(id) on delete cascade,
  question text not null,
  options jsonb not null,
  correct integer not null,
  explain text,
  sort_order integer not null default 0
);

-- Row Level Security -----------------------------------------------------
-- The app (read-only) and admin.html (read + write) both connect using the
-- public "anon" key, because there's no login system yet. That means these
-- policies are wide open: anyone with your Supabase URL/anon key (which is
-- visible in your deployed site's code, always) could technically also
-- write to these tables. For a personal project this is a common accepted
-- tradeoff. If you later want real protection, add Supabase Auth and change
-- the write policies below to `using (auth.uid() is not null)`.

alter table categories enable row level security;
alter table subtopics  enable row level security;
alter table questions  enable row level security;

create policy "public read categories"  on categories  for select using (true);
create policy "public read subtopics"   on subtopics   for select using (true);
create policy "public read questions"   on questions   for select using (true);

create policy "public write categories" on categories  for all using (true) with check (true);
create policy "public write subtopics"  on subtopics   for all using (true) with check (true);
create policy "public write questions"  on questions   for all using (true) with check (true);
