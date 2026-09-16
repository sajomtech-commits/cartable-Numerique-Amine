// Résultats de quiz — table `controles` (RLS : chacun les siens).
import { validToken } from './auth';

export interface Reponse {
  q: string;
  juste: boolean;
}

export interface Controle {
  id: string;
  ficheId: string | null;
  score: number;
  total: number;
  date: string;
  details: Reponse[];
}

const URL = import.meta.env.PUBLIC_SUPABASE_URL || '';
const TABLE = `${URL}/rest/v1/controles`;

function entetes(token: string): HeadersInit {
  return {
    apikey: import.meta.env.PUBLIC_SUPABASE_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

/** Tous les quiz passés, du plus récent au plus ancien. */
export async function getControles(): Promise<Controle[]> {
  const token = await validToken();
  if (!token) return [];
  try {
    const res = await fetch(`${TABLE}?select=*&order=created_at.desc&limit=500`, { headers: entetes(token) });
    if (!res.ok) return [];
    const rows = await res.json();
    return (rows as any[]).map((r) => ({
      id: r.id,
      ficheId: r.fiche_id ?? null,
      score: r.score ?? 0,
      total: r.total ?? 0,
      date: r.created_at,
      details: Array.isArray(r.details) ? r.details : [],
    }));
  } catch { return []; }
}

/** Enregistre un résultat de quiz. */
export async function enregistrerControle(
  ficheId: string | null,
  score: number,
  total: number,
  details: Reponse[]
): Promise<boolean> {
  const token = await validToken();
  if (!token) return false;
  try {
    const res = await fetch(TABLE, {
      method: 'POST',
      headers: entetes(token),
      body: JSON.stringify({ fiche_id: ficheId, score, total, details }),
    });
    return res.ok;
  } catch { return false; }
}

/** Score moyen (0-100) sur une liste de contrôles, ou null si aucun. */
export function scoreMoyen(controles: Controle[]): number | null {
  const total = controles.reduce((n, c) => n + c.total, 0);
  if (!total) return null;
  const reussis = controles.reduce((n, c) => n + c.score, 0);
  return Math.round((reussis / total) * 100);
}
