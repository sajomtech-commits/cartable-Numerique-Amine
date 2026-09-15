-- ============================================================
--  Chantier B — stockage des cours (PDF / photos) par matière/chapitre
--  Bucket privé « cours » + colonne `fichiers` sur les fiches.
--  `fichiers` est un tableau JSON : [{path, nom, type, taille}, ...]
--  (un PDF = 1 élément ; une prise de vue multi-pages = N éléments)
-- ============================================================

-- ---------- bucket privé ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cours', 'cours', false, 52428800,          -- 50 Mo max
  array['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do nothing;

-- ---------- colonne de liaison sur les fiches ----------
alter table public.fiches
  add column if not exists fichiers jsonb not null default '[]'::jsonb;

-- Colonnes fichier_* d'une première version, jamais utilisées : retirées au profit
-- du tableau `fichiers` (gère plusieurs photos). Idempotent.
alter table public.fiches
  drop column if exists fichier_path,
  drop column if exists fichier_nom,
  drop column if exists fichier_type,
  drop column if exists fichier_taille;

-- ---------- policies Storage : chacun son dossier ----------
-- Convention de chemin : {user_id}/{matiere}/{chapitre}/{fichier}
-- La première « folder » du chemin doit être l'uid de l'utilisateur connecté.

drop policy if exists cours_select_own on storage.objects;
create policy cours_select_own on storage.objects for select
  using (bucket_id = 'cours' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists cours_insert_own on storage.objects;
create policy cours_insert_own on storage.objects for insert
  with check (bucket_id = 'cours' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists cours_update_own on storage.objects;
create policy cours_update_own on storage.objects for update
  using (bucket_id = 'cours' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists cours_delete_own on storage.objects;
create policy cours_delete_own on storage.objects for delete
  using (bucket_id = 'cours' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';
