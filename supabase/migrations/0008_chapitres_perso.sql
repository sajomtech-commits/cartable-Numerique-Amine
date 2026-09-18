-- ============================================================
--  Phase 1 (suite) — chapitres propres à chaque utilisateur
--  Consolidation des chapitres existants sur le compte principal
--  d'Amine puis passage en RLS « eachone its own ».
-- ============================================================

-- 1) Consolider tous les chapitres existants sur le compte principal d'Amine
update public.chapitres
   set user_id = '9aba3645-d1fe-4563-9556-8494beddcc59'
 where user_id is null
    or user_id <> '9aba3645-d1fe-4563-9556-8494beddcc59';

-- 2) Unicité par utilisateur (au lieu de globale matière+titre)
drop index if exists chapitres_unique;
create unique index if not exists chapitres_user_matiere_titre
  on public.chapitres (user_id, matiere, titre);

-- 3) RLS : lectures/écritures réservées au propriétaire
drop policy if exists chapitres_select on public.chapitres;
create policy chapitres_select on public.chapitres for select using (auth.uid() = user_id);

drop policy if exists chapitres_insert on public.chapitres;
create policy chapitres_insert on public.chapitres for insert with check (auth.uid() = user_id);

drop policy if exists chapitres_update on public.chapitres;
create policy chapitres_update on public.chapitres for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists chapitres_delete on public.chapitres;
create policy chapitres_delete on public.chapitres for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';