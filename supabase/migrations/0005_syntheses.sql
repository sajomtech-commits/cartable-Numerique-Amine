-- ============================================================
--  Résumés de chapitre générés PAR L'UTILISATEUR (jamais automatiques)
--  Chaque résumé est archivé avec un titre et une date.
-- ============================================================

create table if not exists public.syntheses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid default auth.uid(),
  chapitre_id uuid references public.chapitres(id) on delete cascade,
  titre       text not null,
  contenu     text not null,              -- résumé (markdown produit par l'IA)
  created_at  timestamptz not null default now()
);

alter table public.syntheses enable row level security;

drop policy if exists syntheses_select_own on public.syntheses;
create policy syntheses_select_own on public.syntheses for select using (auth.uid() = user_id);

drop policy if exists syntheses_insert_own on public.syntheses;
create policy syntheses_insert_own on public.syntheses for insert with check (auth.uid() = user_id);

drop policy if exists syntheses_delete_own on public.syntheses;
create policy syntheses_delete_own on public.syntheses for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';