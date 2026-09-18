// Famille : le parent (sajomtech…) peut basculer sur les comptes de ses enfants
// sans leur mot de passe (edge function /basculer → session GoTrue échangée).
import { validToken, basculerSession, userID } from './auth';

export interface Enfant { uid: string; prenom: string; classe: string | null; }

const URL = (import.meta.env.PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = import.meta.env.PUBLIC_SUPABASE_KEY || '';

function entetes(token: string): HeadersInit {
  return {
    apikey: KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0',
  };
}

/** Le uid du parent du compte courant (si l'utilisateur est un enfant lié). */
export async function monParent(): Promise<string | null> {
  const token = await validToken();
  const uid = userID();
  if (!token || !uid) return null;
  try {
    const res = await fetch(`${URL}/rest/v1/liaisons_famille?select=parent_id&enfant_id=eq.${uid}&limit=1`, { headers: entetes(token) });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length ? rows[0].parent_id : null;
  } catch { return null; }
}

/** Liste des enfants du compte courant (prénom + classe). */
export async function mesEnfants(): Promise<Enfant[]> {
  const token = await validToken();
  const uid = userID();
  if (!token || !uid) return [];
  try {
    const res = await fetch(`${URL}/rest/v1/liaisons_famille?select=enfant_id&parent_id=eq.${uid}`, { headers: entetes(token) });
    if (!res.ok) return [];
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) return [];
    const uids = rows.map((r: any) => r.enfant_id).join(',');
    const resP = await fetch(`${URL}/rest/v1/profils?select=user_id,prenom,classe&user_id=in.(${uids})`, { headers: entetes(token) });
    if (!resP.ok) return [];
    const profils = await resP.json();
    if (!Array.isArray(profils)) return [];
    return profils.map((p: any) => ({
      uid: p.user_id,
      prenom: p.prenom || 'Enfant',
      classe: p.classe ?? null,
    }));
  } catch { return []; }
}

/** Bascule sur le compte d'un enfant (session échangée côté serveur). */
export async function basculerEnfant(uid: string): Promise<boolean> {
  const token = await validToken();
  if (!token) return false;
  try {
    const res = await fetch(`${URL}/functions/v1/cartable-ia/basculer`, {
      method: 'POST',
      headers: entetes(token),
      body: JSON.stringify({ cible: uid }),
    });
    const data = await res.json();
    if (!res.ok || !data?.access_token || !data?.refresh_token) return false;
    basculerSession(data.access_token, data.refresh_token, Number(data.expires_at) || Date.now() + 3600_000, data.email || '');
    return true;
  } catch { return false; }
}