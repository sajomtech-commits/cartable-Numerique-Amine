-- Liaisons famille : un parent (sajomtech…) peut basculer sur les comptes de ses enfants.
-- Appliquée le 2026-09-18 (via pg-meta) + backfill assiya → sajomtech.

create table if not exists public.liaisons_famille (
  parent_id uuid not null references auth.users(id) on delete cascade,
  enfant_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, enfant_id)
);

alter table public.liaisons_famille enable row level security;

-- Le parent voit ses enfants ; l'enfant voit son parent (pour « revenir au compte parent »).
drop policy if exists parent_liste_enfants on public.liaisons_famille;
create policy parent_liste_enfants on public.liaisons_famille
  for select using (auth.uid() = parent_id);

drop policy if exists enfant_voit_parent on public.liaisons_famille;
create policy enfant_voit_parent on public.liaisons_famille
  for select using (auth.uid() = enfant_id);

-- Insertions : service_role uniquement (edge function /creer-compte, /basculer vérifie la liaison).

-- Le parent peut lire les profils (prénom/classe) de ses enfants.
drop policy if exists parent_lit_profils_enfants on public.profils;
create policy parent_lit_profils_enfants on public.profils
  for select using (
    exists (select 1 from public.liaisons_famille lf
            where lf.parent_id = auth.uid() and lf.enfant_id = profils.user_id)
  );

-- Liens existants (sept. 2026) : Assiya (assiyou15@gmail.com) rattachée à sajomtech@gmail.com.
insert into public.liaisons_famille (parent_id, enfant_id) values
  ('0152fbfd-b663-4969-9672-e6fa1c8374b1', 'aa33ee2c-01b9-4829-84aa-179d9a3e1b55')
on conflict do nothing;