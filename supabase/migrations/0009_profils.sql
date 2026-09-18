-- ============================================================
--  Phase 2 — profils (prénom + classe) et matières par défaut par niveau
--  Le profil est la fiche d'identité de chaque enfant (affichée à l'accueil).
-- ============================================================

create table if not exists public.profils (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  prenom     text not null,
  classe     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profils enable row level security;

drop policy if exists profils_select_own on public.profils;
create policy profils_select_own on public.profils for select using (auth.uid() = user_id);

drop policy if exists profils_insert_own on public.profils;
create policy profils_insert_own on public.profils for insert with check (auth.uid() = user_id);

drop policy if exists profils_update_own on public.profils;
create policy profils_update_own on public.profils for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';