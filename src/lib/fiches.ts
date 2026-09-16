// Fiches de révision — stockage Supabase (REST) par utilisateur authentifié
import { validToken } from './auth';
import type { FichierCours } from './storage';

export interface Fiche {
  id: string;
  matiere: string;
  titre: string;
  chapitreId?: string | null;
  chapitre?: string;
  resume: string;
  pointsCles: string[];
  quiz: { q: string; r: string }[];
  date: string;
  /** Texte du cours d'origine (OCR ou extraction PDF). */
  sourceContenu: string;
  /** Matières vivantes : traduction française + vocabulaire. */
  traduction: string;
  vocabulaire: { mot: string; fr: string }[];
  /** Cours d'origine conservés dans le bucket privé « cours » (1 PDF, ou N photos). */
  fichiers: FichierCours[];
}

const URL = import.meta.env.PUBLIC_SUPABASE_URL || '';
const TABLE = `${URL}/rest/v1/fiches`;

function headers(token: string): HeadersInit {
  return {
    apikey: import.meta.env.PUBLIC_SUPABASE_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

interface QuizRow { Q?: string; q?: string; R?: string; r?: string }
interface Row {
  id: string; matiere?: string; titre: string; resume?: string;
  points_cles?: string[]; quiz?: QuizRow[]; created_at?: string;
  chapitre_id?: string | null; chapitres?: { titre?: string } | null;
  fichiers?: FichierCours[] | null; source_contenu?: string | null;
  traduction?: string | null; vocabulaire?: { mot: string; fr: string }[] | null;
}

function mapRow(r: Row): Fiche {
  return {
    id: r.id,
    matiere: r.matiere || '',
    titre: r.titre,
    chapitreId: r.chapitre_id ?? null,
    chapitre: r.chapitres?.titre || '',
    resume: r.resume || '',
    pointsCles: r.points_cles || [],
    quiz: (r.quiz || []).map((q) => ({ q: q.Q ?? q.q ?? '', r: q.R ?? q.r ?? '' })),
    date: r.created_at || new Date().toISOString(),
    sourceContenu: r.source_contenu || '',
    traduction: r.traduction || '',
    vocabulaire: Array.isArray(r.vocabulaire) ? r.vocabulaire : [],
    fichiers: Array.isArray(r.fichiers) ? r.fichiers : [],
  };
}

export async function getFiches(): Promise<Fiche[]> {
  const token = await validToken();
  if (!token) return [];
  try {
    const res = await fetch(`${TABLE}?select=*,chapitres(titre)&order=created_at.desc&limit=200`, { headers: headers(token) });
    if (!res.ok) return [];
    return (await res.json()).map(mapRow);
  } catch { return []; }
}

export async function saveFiche(f: Omit<Fiche, 'id' | 'date'>): Promise<Fiche> {
  const token = await validToken();
  if (!token) throw new Error('Non connecté');
  const body = {
    matiere: f.matiere,
    titre: f.titre,
    resume: f.resume,
    points_cles: f.pointsCles,
    quiz: f.quiz.map((q) => ({ Q: q.q, R: q.r })),
    source_type: f.fichiers.length ? (f.fichiers[0].type || 'texte') : 'texte',
    chapitre_id: f.chapitreId || null,
    fichiers: f.fichiers || [],
    source_contenu: f.sourceContenu || null,
    traduction: f.traduction || null,
    vocabulaire: f.vocabulaire || [],
    // user_id est posé par la base via default auth.uid() quand la session est authentifiée
  };
  const res = await fetch(TABLE, { method: 'POST', headers: headers(token), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Enregistrement échoué (${res.status})`);
  const row = (await res.json())[0];
  return { ...f, id: row.id, date: row.created_at || new Date().toISOString() };
}

export async function deleteFiche(id: string): Promise<void> {
  const token = await validToken();
  if (!token) return;
  await fetch(`${TABLE}?id=eq.${id}`, { method: 'DELETE', headers: headers(token) });
}

export async function fichesParMatiere(matiere: string): Promise<Fiche[]> {
  return (await getFiches()).filter((f) => f.matiere === matiere);
}

/** Met à jour le titre et/ou le résumé d'une fiche. */
export async function updateFiche(id: string, patch: { titre?: string; resume?: string }): Promise<boolean> {
  const token = await validToken();
  if (!token) return false;
  const body: Record<string, string> = {};
  if (patch.titre !== undefined) body.titre = patch.titre;
  if (patch.resume !== undefined) body.resume = patch.resume;
  if (!Object.keys(body).length) return false;
  const res = await fetch(`${TABLE}?id=eq.${id}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) return false;
  try { const r = await res.json(); return Array.isArray(r) && r.length > 0; } catch { return false; }
}
