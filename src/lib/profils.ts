// Profil de l'utilisateur (prénom + classe) — affiché à l'accueil.
import { validToken } from './auth';

export interface Profil { prenom: string; classe: string | null; }

const URL = (import.meta.env.PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = import.meta.env.PUBLIC_SUPABASE_KEY || '';
const TABLE = `${URL}/rest/v1/profils`;

function entetes(token: string): HeadersInit {
  return {
    apikey: KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

/** Profil de l'utilisateur connecté, ou null s'il n'a pas encore de profil. */
export async function getProfil(): Promise<Profil | null> {
  const token = await validToken();
  if (!token) return null;
  try {
    const res = await fetch(`${TABLE}?select=prenom,classe&limit=1`, { headers: entetes(token) });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) return null;
    return { prenom: rows[0].prenom, classe: rows[0].classe ?? null };
  } catch { return null; }
}

/** Crée ou met à jour le profil de l'utilisateur connecté. */
export async function setProfil(prenom: string, classe: string): Promise<boolean> {
  const token = await validToken();
  if (!token) return false;
  const propre = prenom.trim().slice(0, 40);
  const cl = classe.trim().slice(0, 30) || null;
  if (!propre) return false;
  try {
    const existant = await getProfil();
    if (existant) {
      const res = await fetch(`${TABLE}?user_id=eq.${await uidToken(token)}`, {
        method: 'PATCH',
        headers: entetes(token),
        body: JSON.stringify({ prenom: propre, classe: cl }),
      });
      return res.ok;
    }
    const res = await fetch(TABLE, {
      method: 'POST',
      headers: entetes(token),
      body: JSON.stringify({ prenom: propre, classe: cl }),
    });
    return res.ok;
  } catch { return false; }
}

async function uidToken(token: string): Promise<string> {
  try {
    const part = token.split('.')[1] || '';
    const j = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return j.sub || '';
  } catch { return ''; }
}