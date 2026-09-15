-- ============================================================
--  Cartable Numérique — schéma initial (état constaté 2026-09-15)
--  Tables : chapitres, fiches, controles  + RLS "own"
--  Idempotent : peut être rejoué sur une base vierge.
-- ============================================================

-- ---------- chapitres (programme partagé + chapitres perso) ----------
create table if not exists public.chapitres (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid default auth.uid(),      -- NULL = chapitre du programme (partagé)
  matiere    text not null,
  numero     integer,
  titre      text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists chapitres_unique on public.chapitres (matiere, titre);

-- ---------- fiches de révision ----------
create table if not exists public.fiches (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  titre          text not null,
  resume         text,
  points_cles    jsonb default '[]'::jsonb,
  quiz           jsonb default '[]'::jsonb,
  source_type    text default 'texte',
  source_contenu text,
  matiere        text default '',
  chapitre_id    uuid references public.chapitres(id) on delete set null
);

-- ---------- controles (quiz passés) ----------
create table if not exists public.controles (
  id         uuid primary key default gen_random_uuid(),
  fiche_id   uuid references public.fiches(id) on delete cascade,
  user_id    uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  score      integer,
  total      integer,
  details    jsonb default '[]'::jsonb
);

-- ---------- RLS ----------
alter table public.chapitres enable row level security;
alter table public.fiches    enable row level security;
alter table public.controles enable row level security;

-- chapitres : lecture publique (programme partagé), écriture seulement par le propriétaire
drop policy if exists chapitres_select on public.chapitres;
create policy chapitres_select on public.chapitres for select using (true);

drop policy if exists chapitres_insert on public.chapitres;
create policy chapitres_insert on public.chapitres for insert
  with check ((auth.uid() = user_id) or (user_id is null));

drop policy if exists chapitres_update on public.chapitres;
create policy chapitres_update on public.chapitres for update using (auth.uid() = user_id);

drop policy if exists chapitres_delete on public.chapitres;
create policy chapitres_delete on public.chapitres for delete using (auth.uid() = user_id);

-- fiches : strictement privées
drop policy if exists fiches_select_own on public.fiches;
create policy fiches_select_own on public.fiches for select using (auth.uid() = user_id);

drop policy if exists fiches_insert_own on public.fiches;
create policy fiches_insert_own on public.fiches for insert with check (auth.uid() = user_id);

drop policy if exists fiches_update_own on public.fiches;
create policy fiches_update_own on public.fiches for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists fiches_delete_own on public.fiches;
create policy fiches_delete_own on public.fiches for delete using (auth.uid() = user_id);

-- controles : strictement privés
drop policy if exists controles_select_own on public.controles;
create policy controles_select_own on public.controles for select using (auth.uid() = user_id);

drop policy if exists controles_insert_own on public.controles;
create policy controles_insert_own on public.controles for insert with check (auth.uid() = user_id);

-- ---------- updated_at automatique (manquant aujourd'hui) ----------
create or replace function public.toucher_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists fiches_updated_at on public.fiches;
create trigger fiches_updated_at before update on public.fiches
  for each row execute function public.toucher_updated_at();

-- ---------- recharger le cache de schéma PostgREST ----------
notify pgrst, 'reload schema';
