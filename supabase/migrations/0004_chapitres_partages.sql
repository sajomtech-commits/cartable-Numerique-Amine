-- ============================================================
--  Fix — chapitres modifiables/supprimables par l'utilisateur connecté
--
--  Contexte : la lecture des chapitres était déjà partagée (policy select
--  `using (true)`), mais update/delete exigeaient `auth.uid() = user_id`.
--  Résultat : un chapitre créé par un autre compte (ou avec user_id NULL)
--  restait visible mais impossible à renommer/supprimer — et PostgREST
--  renvoyait 200 avec un tableau vide, donc l'interface croyait avoir réussi.
--
--  Le cartable est mono-utilisateur : les chapitres forment une bibliothèque
--  partagée, tout utilisateur connecté peut les gérer.
--  (À revoir pour l'app collège : un prof ne doit gérer que ses chapitres.)
-- ============================================================

drop policy if exists chapitres_update on public.chapitres;
create policy chapitres_update on public.chapitres for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists chapitres_delete on public.chapitres;
create policy chapitres_delete on public.chapitres for delete
  using (auth.uid() is not null);

notify pgrst, 'reload schema';
