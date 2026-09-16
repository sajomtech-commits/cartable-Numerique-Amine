// Révisions audio archivées (script IA + MP3 edge-tts, stockées par chapitre)
import { validToken } from './auth';

export interface AudioRev {
  id: string;
  chapitreId: string | null;
  ficheId: string | null;
  titre: string;
  path: string;
  dureeSec: number;
  date: string;
}

const URL = (import.meta.env.PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = import.meta.env.PUBLIC_SUPABASE_KEY || '';
const TABLE = `${URL}/rest/v1/audios`;

function entetes(token: string): HeadersInit {
  return {
    apikey: KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

/** Révisions audio d'un chapitre, du plus récent au plus ancien. */
export async function getAudios(chapitreId?: string): Promise<AudioRev[]> {
  const token = await validToken();
  if (!token) return [];
  try {
    const filtre = chapitreId ? `&chapitre_id=eq.${encodeURIComponent(chapitreId)}` : '';
    const res = await fetch(`${TABLE}?select=id,chapitre_id,fiche_id,titre,path,duree_sec,created_at${filtre}&order=created_at.desc&limit=100`, { headers: entetes(token) });
    if (!res.ok) return [];
    const rows = await res.json();
    return (rows as any[]).map((r) => ({
      id: r.id,
      chapitreId: r.chapitre_id ?? null,
      ficheId: r.fiche_id ?? null,
      titre: r.titre,
      path: r.path,
      dureeSec: r.duree_sec ?? 0,
      date: r.created_at,
    }));
  } catch { return []; }
}

/** Enregistre une révision audio. */
export async function saveAudio(chapitreId: string | null, ficheId: string | null, titre: string, path: string, dureeSec: number): Promise<AudioRev | null> {
  const token = await validToken();
  if (!token) return null;
  try {
    const res = await fetch(TABLE, {
      method: 'POST',
      headers: entetes(token),
      body: JSON.stringify({ chapitre_id: chapitreId, fiche_id: ficheId, titre, path, duree_sec: dureeSec }),
    });
    if (!res.ok) return null;
    const row = (await res.json())[0];
    return { id: row.id, chapitreId, ficheId, titre, path, dureeSec, date: row.created_at };
  } catch { return null; }
}

/** Supprime une révision audio. */
export async function deleteAudio(id: string): Promise<boolean> {
  const token = await validToken();
  if (!token) return false;
  try {
    const res = await fetch(`${TABLE}?id=eq.${id}`, { method: 'DELETE', headers: entetes(token) });
    if (!res.ok) return false;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch { return false; }
}

/** Lien signé temporaire de lecture (bucket privé « audio »). */
export async function audioUrl(path: string): Promise<string | null> {
  const token = await validToken();
  if (!token || !path) return null;
  try {
    const res = await fetch(`${URL}/storage/v1/object/sign/audio/${path}`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: 3600 }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j?.signedURL ? `${URL}/storage/v1${j.signedURL}` : null;
  } catch { return null; }
}