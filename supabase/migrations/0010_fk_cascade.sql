-- ============================================================
--  Nettoyage : FK cascade user_id → auth.users sur toutes les
--  tables du cartable (supprimer un compte supprime ses données).
-- ============================================================

delete from public.matieres m
 where m.user_id is not null
   and not exists (select 1 from auth.users u where u.id = m.user_id);

alter table public.matieres  add constraint matieres_user_fk  foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.chapitres add constraint chapitres_user_fk foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.fiches    add constraint fiches_user_fk    foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.controles add constraint controles_user_fk foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.audios    add constraint audios_user_fk    foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.syntheses add constraint syntheses_user_fk foreign key (user_id) references auth.users(id) on delete cascade;

notify pgrst, 'reload schema';