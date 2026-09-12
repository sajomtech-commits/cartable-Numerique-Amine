// Fiches de révision — stockage Supabase (REST) partagé
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
const KEY = import.meta.env.PUBLIC_SUPABASE_KEY || '';
const TABLE = `${URL}/rest/v1/fiches`;

function headers(): HeadersInit {
  return {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

interface QuizRow { Q?: string; q?: string; R?: string; r?: string }
interface Row {
  id: string; matiere?: string; titre: string; resume?: string;
  points_cles?: string[]; quiz?: QuizRow[]; created_at?: string;
}

// Row Supabase -> Fiche applicative
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
  if (!URL || !KEY) return [];
  try {
    const res = await fetch(`${TABLE}?select=*&order=created_at.desc&limit=200`, { headers: headers() });
    if (!res.ok) return [];
    return (await res.json()).map(mapRow);
  } catch { return []; }
}

export async function saveFiche(f: Omit<Fiche, 'id' | 'date'>): Promise<Fiche> {
  const body = {
    matiere: f.matiere,
    titre: f.titre,
    resume: f.resume,
    points_cles: f.pointsCles,
    quiz: f.quiz.map((q) => ({ Q: q.q, R: q.r })),
    source_type: 'texte',
  };
  const res = await fetch(TABLE, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Enregistrement Supabase échoué (${res.status})`);
  const row = (await res.json())[0];
  return { ...f, id: row.id, date: row.created_at || new Date().toISOString() };
}

export async function deleteFiche(id: string): Promise<void> {
  await fetch(`${TABLE}?id=eq.${id}`, { method: 'DELETE', headers: headers() });
}

export async function fichesParMatiere(matiere: string): Promise<Fiche[]> {
  return (await getFiches()).filter((f) => f.matiere === matiere);
}
