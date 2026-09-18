-- ============================================================
--  Matières dynamiques par utilisateur (Phase 1 — multi-enfants)
--  Chaque compte a ses propres matières (créables / supprimables).
-- ============================================================

create table if not exists public.matieres (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid default auth.uid(),
  nom        text not null,
  icone      text,
  couleur    text,
  ordre      integer,
  created_at timestamptz not null default now()
);

alter table public.matieres enable row level security;

drop policy if exists matieres_select_own on public.matieres;
create policy matieres_select_own on public.matieres for select using (auth.uid() = user_id);

drop policy if exists matieres_insert_own on public.matieres;
create policy matieres_insert_own on public.matieres for insert with check (auth.uid() = user_id);

drop policy if exists matieres_update_own on public.matieres;
create policy matieres_update_own on public.matieres for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists matieres_delete_own on public.matieres;
create policy matieres_delete_own on public.matieres for delete using (auth.uid() = user_id);

create unique index if not exists matieres_user_nom on public.matieres (user_id, lower(nom));

notify pgrst, 'reload schema';