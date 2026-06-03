-- =====================================================================
-- TASTING APP — Supabase / Postgres Schema
-- Generisches Getränke-Tasting (Prototyp: Whisky; später Bier, Spirituosen).
-- Sichtbarkeit: global (öffentliche Landing Page) + Gruppen-privat.
-- Alle Tabellen mit Row Level Security (RLS).
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- =====================================================================
-- 1. PROFILES  (1:1 zu auth.users)
-- =====================================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  display_name text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Profile sind öffentlich lesbar (für Anzeige "wer hat bewertet"),
-- aber nur selbst editierbar.
create policy "profiles_select_all"
  on public.profiles for select using (true);
create policy "profiles_update_own"
  on public.profiles for update using ((select auth.uid()) = id);
create policy "profiles_insert_own"
  on public.profiles for insert with check ((select auth.uid()) = id);

-- Beim Sign-Up automatisch Profil anlegen
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1))
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 2. DRINKS  (globaler Katalog — jedes Getränk existiert genau einmal)
--    Generisch gehalten: category erlaubt später Bier, Gin, Rum etc.
--    Im Prototyp setzt das Frontend category fix auf 'whisky'.
-- =====================================================================
create table public.drinks (
  id           uuid primary key default gen_random_uuid(),
  category     text not null default 'whisky',   -- 'whisky' | 'beer' | 'rum' | 'gin' | ...
  name         text not null,
  producer     text,                             -- Brennerei / Brauerei / Hersteller
  region       text,
  age_years    int,                              -- optional (z. B. bei Whisky)
  abv          numeric(4,1),                      -- Alkoholgehalt %
  photo_url    text,
  -- Flexible Zusatzfelder je Kategorie (z. B. Biersorte, Fasstyp), ohne Schemaänderung:
  attributes   jsonb not null default '{}'::jsonb,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
alter table public.drinks enable row level security;

-- Katalog ist global lesbar; eingeloggte Nutzer dürfen anlegen.
create policy "drinks_select_all"
  on public.drinks for select using (true);
create policy "drinks_insert_auth"
  on public.drinks for insert with check ((select auth.uid()) is not null);
create policy "drinks_update_creator"
  on public.drinks for update using ((select auth.uid()) = created_by);

-- =====================================================================
-- 3. GROUPS  +  MEMBERSHIPS  +  INVITES
-- =====================================================================
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  invite_code text unique not null default encode(gen_random_bytes(6),'hex'),
  created_at  timestamptz not null default now()
);
alter table public.groups enable row level security;

create table public.group_members (
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  role      text not null default 'member',   -- 'owner' | 'admin' | 'member'
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table public.group_members enable row level security;

-- Helper: ist der aktuelle User Mitglied einer Gruppe?
-- SECURITY DEFINER umgeht RLS-Rekursion bei der Prüfung.
create or replace function public.is_group_member(g uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists(
    select 1 from public.group_members
    where group_id = g and user_id = auth.uid()
  );
$$;

-- Gruppen: nur Mitglieder sehen die Gruppe; jeder eingeloggte darf eine erstellen.
create policy "groups_select_member"
  on public.groups for select using (public.is_group_member(id));
create policy "groups_insert_auth"
  on public.groups for insert with check ((select auth.uid()) = owner_id);
create policy "groups_update_owner"
  on public.groups for update using ((select auth.uid()) = owner_id);
create policy "groups_delete_owner"
  on public.groups for delete using ((select auth.uid()) = owner_id);

-- Mitgliedschaften: man sieht die Mitglieder der eigenen Gruppen.
create policy "members_select_same_group"
  on public.group_members for select using (public.is_group_member(group_id));
-- Beitritt: man fügt sich selbst hinzu (App prüft den Invite-Code vorher).
create policy "members_insert_self"
  on public.group_members for insert with check ((select auth.uid()) = user_id);
create policy "members_delete_self_or_owner"
  on public.group_members for delete using (
    (select auth.uid()) = user_id
    or exists(select 1 from public.groups g where g.id = group_id and g.owner_id = (select auth.uid()))
  );

-- =====================================================================
-- 4. RATINGS  (Kern: eine Bewertung pro User pro Whisky)
--    visibility steuert global vs. privat.
-- =====================================================================
create table public.ratings (
  id          uuid primary key default gen_random_uuid(),
  drink_id   uuid not null references public.drinks(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  -- Noten 1..10
  nose        int  check (nose   between 1 and 10),
  taste       int  check (taste  between 1 and 10),
  finish      int  check (finish between 1 and 10),
  overall     numeric(3,1),               -- berechneter Schnitt, von der App gesetzt
  color_idx   int  check (color_idx between 0 and 9),
  -- Geschmacksräder: 12 Achsen je 0..5, als JSON {"nose":[..],"taste":[..]}
  wheels      jsonb not null default '{"nose":[],"taste":[]}'::jsonb,
  note        text,
  -- Sichtbarkeit
  is_public   boolean not null default true,   -- erscheint auf globaler Landing Page
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (drink_id, user_id)                  -- genau eine Bewertung pro Whisky/User
);
alter table public.ratings enable row level security;

-- Sichtbarkeit beim Lesen:
--  a) öffentliche Bewertungen sieht jeder (Landing Page)
--  b) eigene Bewertungen sieht man immer
--  c) Bewertungen, die in einer gemeinsamen Gruppe geteilt wurden, sieht man (siehe Tabelle 5)
create policy "ratings_select_public_or_own"
  on public.ratings for select using (
    is_public
    or user_id = (select auth.uid())
    or exists (
      select 1
      from public.group_ratings gr
      where gr.rating_id = ratings.id
        and public.is_group_member(gr.group_id)
    )
  );
create policy "ratings_insert_own"
  on public.ratings for insert with check ((select auth.uid()) = user_id);
create policy "ratings_update_own"
  on public.ratings for update using ((select auth.uid()) = user_id);
create policy "ratings_delete_own"
  on public.ratings for delete using ((select auth.uid()) = user_id);

-- =====================================================================
-- 5. GROUP_RATINGS  (welche Bewertung wurde in welche Gruppe geteilt)
--    Erfüllt: "Bewertung mit der Gruppe teilen, ohne neu zu bewerten"
-- =====================================================================
create table public.group_ratings (
  group_id   uuid not null references public.groups(id) on delete cascade,
  rating_id  uuid not null references public.ratings(id) on delete cascade,
  shared_by  uuid not null references public.profiles(id) on delete cascade,
  shared_at  timestamptz not null default now(),
  primary key (group_id, rating_id)
);
alter table public.group_ratings enable row level security;

create policy "group_ratings_select_member"
  on public.group_ratings for select using (public.is_group_member(group_id));
-- Teilen darf man nur die eigene Bewertung, und nur in eine Gruppe, in der man Mitglied ist.
create policy "group_ratings_insert_member_own"
  on public.group_ratings for insert with check (
    public.is_group_member(group_id)
    and shared_by = (select auth.uid())
    and exists (select 1 from public.ratings r where r.id = rating_id and r.user_id = (select auth.uid()))
  );
create policy "group_ratings_delete_owner"
  on public.group_ratings for delete using (shared_by = (select auth.uid()));

-- =====================================================================
-- 6. TASTINGS  (exklusives Event in einer Gruppe, mit Rangliste)
-- =====================================================================
create table public.tastings (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups(id) on delete cascade,
  title       text not null,
  hosted_by   uuid references public.profiles(id) on delete set null,
  status      text not null default 'open',   -- 'open' | 'closed'
  event_date  date,
  created_at  timestamptz not null default now()
);
alter table public.tastings enable row level security;

create policy "tastings_select_member"
  on public.tastings for select using (public.is_group_member(group_id));
create policy "tastings_insert_member"
  on public.tastings for insert with check (public.is_group_member(group_id) and hosted_by = (select auth.uid()));
create policy "tastings_update_host"
  on public.tastings for update using (hosted_by = (select auth.uid()));
create policy "tastings_delete_host"
  on public.tastings for delete using (hosted_by = (select auth.uid()));

-- Welche Whiskies gehören zum Tasting (Reihenfolge per position)
create table public.tasting_drinks (
  tasting_id uuid not null references public.tastings(id) on delete cascade,
  drink_id  uuid not null references public.drinks(id) on delete cascade,
  position   int not null default 0,
  primary key (tasting_id, drink_id)
);
alter table public.tasting_drinks enable row level security;

create policy "tw_select_member"
  on public.tasting_drinks for select using (
    exists(select 1 from public.tastings t where t.id = tasting_id and public.is_group_member(t.group_id))
  );
create policy "tw_modify_member"
  on public.tasting_drinks for all using (
    exists(select 1 from public.tastings t where t.id = tasting_id and public.is_group_member(t.group_id))
  ) with check (
    exists(select 1 from public.tastings t where t.id = tasting_id and public.is_group_member(t.group_id))
  );

-- Bewertungen INNERHALB eines Tastings (separat von globalen Ratings,
-- da im Tasting jeder jeden Whisky bewertet und daraus eine Rangliste entsteht)
create table public.tasting_ratings (
  id          uuid primary key default gen_random_uuid(),
  tasting_id  uuid not null references public.tastings(id) on delete cascade,
  drink_id   uuid not null references public.drinks(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  nose        int  check (nose   between 1 and 10),
  taste       int  check (taste  between 1 and 10),
  finish      int  check (finish between 1 and 10),
  overall     numeric(3,1),
  wheels      jsonb not null default '{"nose":[],"taste":[]}'::jsonb,
  note        text,
  created_at  timestamptz not null default now(),
  unique (tasting_id, drink_id, user_id)
);
alter table public.tasting_ratings enable row level security;

create policy "tr_select_member"
  on public.tasting_ratings for select using (
    exists(select 1 from public.tastings t where t.id = tasting_id and public.is_group_member(t.group_id))
  );
create policy "tr_insert_own_member"
  on public.tasting_ratings for insert with check (
    user_id = (select auth.uid())
    and exists(select 1 from public.tastings t where t.id = tasting_id and public.is_group_member(t.group_id))
  );
create policy "tr_update_own"
  on public.tasting_ratings for update using (user_id = (select auth.uid()));
create policy "tr_delete_own"
  on public.tasting_ratings for delete using (user_id = (select auth.uid()));

-- =====================================================================
-- 7. DRINK_SESSIONS  ("Ich trinke gerade …" + Benachrichtigung)
-- =====================================================================
create table public.drink_sessions (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  drink_id    uuid references public.drinks(id) on delete set null,
  drink_name  text,                       -- frei benennbar, falls noch nicht im Katalog
  message     text,
  rating_id   uuid references public.ratings(id) on delete set null,  -- optional am Ende geteilt
  started_at  timestamptz not null default now()
);
alter table public.drink_sessions enable row level security;

create policy "ds_select_member"
  on public.drink_sessions for select using (public.is_group_member(group_id));
create policy "ds_insert_own_member"
  on public.drink_sessions for insert with check (
    user_id = (select auth.uid()) and public.is_group_member(group_id)
  );
create policy "ds_update_own"
  on public.drink_sessions for update using (user_id = (select auth.uid()));

-- Reaktionen auf Live-Sessions (Emoji)
create table public.session_reactions (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.drink_sessions(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  emoji       text not null,
  created_at  timestamptz not null default now(),
  unique (session_id, user_id, emoji)
);
alter table public.session_reactions enable row level security;

-- Sichtbarkeit erbt von der Session: exists() respektiert deren RLS automatisch.
create policy "sr_select_visible_session"
  on public.session_reactions for select using (
    exists (select 1 from public.drink_sessions s where s.id = session_id)
  );
create policy "sr_insert_own_visible"
  on public.session_reactions for insert with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.drink_sessions s where s.id = session_id)
  );
create policy "sr_delete_own"
  on public.session_reactions for delete using (user_id = (select auth.uid()));

create index on public.session_reactions (session_id);
alter publication supabase_realtime add table public.session_reactions;

-- =====================================================================
-- 8. INDIZES (Performance für die häufigen Abfragen)
-- =====================================================================
create index on public.ratings (drink_id);
create index on public.ratings (user_id);
create index on public.ratings (is_public) where is_public;
create index on public.group_members (user_id);
create index on public.group_ratings (group_id);
create index on public.tasting_ratings (tasting_id, drink_id);
create index on public.drink_sessions (group_id, started_at desc);

-- =====================================================================
-- 9. VIEW: globale Getränke-Bestenliste (Landing Page)
-- =====================================================================
create or replace view public.global_drink_scores as
  select
    d.id, d.category, d.name, d.producer, d.region, d.photo_url,
    count(r.id)              as num_ratings,
    round(avg(r.overall),1)  as avg_overall
  from public.drinks d
  left join public.ratings r on r.drink_id = d.id and r.is_public
  group by d.id;
-- Views erben RLS der Basistabellen (security_invoker).
alter view public.global_drink_scores set (security_invoker = true);
