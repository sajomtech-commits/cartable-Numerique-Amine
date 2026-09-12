// Fiches de révision — stockage Supabase (REST) par utilisateur authentifié
import { validToken } from './auth';

export interface Fiche {
  id: string;
  matiere: string;
  titre: string;
  resume: string;
  pointsCles: string[];
  quiz: { q: string; r: string }[];
  date: string;
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
}

function mapRow(r: Row): Fiche {
  return {
    id: r.id,
    matiere: r.matiere || '',
    titre: r.titre,
    resume: r.resume || '',
    pointsCles: r.points_cles || [],
    quiz: (r.quiz || []).map((q) => ({ q: q.Q ?? q.q ?? '', r: q.R ?? q.r ?? '' })),
    date: r.created_at || new Date().toISOString(),
  };
}

export async function getFiches(): Promise<Fiche[]> {
  const token = await validToken();
  if (!token) return [];
  try {
    const res = await fetch(`${TABLE}?select=*&order=created_at.desc&limit=200`, { headers: headers(token) });
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
    source_type: 'texte',
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
