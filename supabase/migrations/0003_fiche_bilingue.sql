-- ============================================================
--  Chantier G — aide bilingue pour les langues (anglais, espagnol…)
--  La fiche peut contenir une traduction française du cours
--  et une liste de vocabulaire traduit.
-- ============================================================

alter table public.fiches
  add column if not exists traduction  text,
  add column if not exists vocabulaire jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
