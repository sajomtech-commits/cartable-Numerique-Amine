// Résumés de chapitre archivés (par l'utilisateur, jamais générés automatiquement)
import { validToken } from './auth';

export interface Synthese {
  id: string;
  chapitreId: string;
  titre: string;
  contenu: string;
  date: string;
}

const URL = import.meta.env.PUBLIC_SUPABASE_URL || '';
const TABLE = `${URL}/rest/v1/syntheses`;

function entetes(token: string): HeadersInit {
  return {
    apikey: import.meta.env.PUBLIC_SUPABASE_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

/** Résumés d'un chapitre, du plus récent au plus ancien. */
export async function getSyntheses(chapitreId: string): Promise<Synthese[]> {
  const token = await validToken();
  if (!token) return [];
  try {
    const res = await fetch(
      `${TABLE}?select=id,chapitre_id,titre,contenu,created_at&chapitre_id=eq.${encodeURIComponent(chapitreId)}&order=created_at.desc`,
      { headers: entetes(token) }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return (rows as any[]).map((r) => ({
      id: r.id,
      chapitreId: r.chapitre_id,
      titre: r.titre,
      contenu: r.contenu,
      date: r.created_at,
    }));
  } catch { return []; }
}

/** Enregistre un résumé. */
export async function saveSynthese(chapitreId: string, titre: string, contenu: string): Promise<Synthese | null> {
  const token = await validToken();
  if (!token) return null;
  try {
    const res = await fetch(TABLE, {
      method: 'POST',
      headers: entetes(token),
      body: JSON.stringify({ chapitre_id: chapitreId, titre, contenu }),
    });
    if (!res.ok) return null;
    const row = (await res.json())[0];
    return { id: row.id, chapitreId, titre, contenu, date: row.created_at };
  } catch { return null; }
}

/** Supprime un résumé. */
export async function deleteSynthese(id: string): Promise<boolean> {
  const token = await validToken();
  if (!token) return false;
  try {
    const res = await fetch(`${TABLE}?id=eq.${id}`, { method: 'DELETE', headers: entetes(token) });
    if (!res.ok) return false;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch { return false; }
}