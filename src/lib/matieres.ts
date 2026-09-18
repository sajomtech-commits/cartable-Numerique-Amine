// Matières : liste PAR DÉFAUT (instanciation) + liste DYNAMIQUE par utilisateur (base).
import { validToken } from './auth';

// ---------- Défauts (utilisés au premier lancement d'un compte) ----------
export interface Matiere {
  nom: string;
  icon: string;
  couleur: string;
  accent: string;
  anneau: string;
}

export const DEFAUT_MATIERES: Matiere[] = [
  { nom: 'Maths',             icon: '📐', couleur: 'bg-violet-500',  accent: 'text-violet-300',  anneau: 'ring-violet-500/30' },
  { nom: 'Français',          icon: '📚', couleur: 'bg-rose-500',    accent: 'text-rose-300',    anneau: 'ring-rose-500/30' },
  { nom: 'Physique-Chimie',   icon: '⚗️', couleur: 'bg-indigo-500',  accent: 'text-indigo-300',  anneau: 'ring-indigo-500/30' },
  { nom: 'SVT',               icon: '🧬', couleur: 'bg-lime-500',    accent: 'text-lime-300',    anneau: 'ring-lime-500/30' },
  { nom: 'Anglais',           icon: '🇬🇧', couleur: 'bg-sky-500',     accent: 'text-sky-300',     anneau: 'ring-sky-500/30' },
  { nom: 'Espagnol',          icon: '🇪🇸', couleur: 'bg-orange-500',  accent: 'text-orange-300',  anneau: 'ring-orange-500/30' },
  { nom: 'Histoire-Géo',      icon: '🌍', couleur: 'bg-amber-500',   accent: 'text-amber-300',   anneau: 'ring-amber-500/30' },
  { nom: 'Science Numérique', icon: '💻', couleur: 'bg-cyan-500',    accent: 'text-cyan-300',    anneau: 'ring-cyan-500/30' },
  { nom: 'Science Éco',       icon: '📊', couleur: 'bg-teal-500',    accent: 'text-teal-300',    anneau: 'ring-teal-500/30' },
  { nom: 'Sport',             icon: '⚽', couleur: 'bg-emerald-500', accent: 'text-emerald-300', anneau: 'ring-emerald-500/30' },
];

/** Compat : liste statique par défaut (fallback build / anciennes références). */
export const MATIERES: Matiere[] = DEFAUT_MATIERES;

// ---------- API dynamique (par utilisateur) ----------
export interface MatiereDyn {
  id: string;
  nom: string;
  icone: string | null;
  ordre: number | null;
}

const URL = import.meta.env.PUBLIC_SUPABASE_URL || '';
const TABLE = `${URL}/rest/v1/matieres`;

function entetes(token: string): HeadersInit {
  return {
    apikey: import.meta.env.PUBLIC_SUPABASE_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

/** Icône par défaut pour un nom (défauts + repli 📖). */
export function iconePour(nom: string): string {
  return DEFAUT_MATIERES.find((m) => m.nom === nom)?.icon || '📖';
}

/**
 * Matières de l'utilisateur connecté. Si le compte n'en a aucune,
 * on initialise avec la liste par défaut (auto-init au premier accès).
 */
export async function getMatieres(): Promise<MatiereDyn[]> {
  const token = await validToken();
  if (!token) return [];
  try {
    const res = await fetch(`${TABLE}?select=id,nom,icone,ordre&order=ordre.asc.nullslast,nom.asc`, { headers: entetes(token) });
    if (!res.ok) return [];
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length) {
      return rows.map((r: any) => ({ id: r.id, nom: r.nom, icone: r.icone || iconePour(r.nom), ordre: r.ordre ?? null }));
    }
    // auto-init : le compte n'a pas de matières → on insère les défauts
    const ok = await Promise.all(DEFAUT_MATIERES.map((m, i) =>
      fetch(TABLE, { method: 'POST', headers: entetes(token), body: JSON.stringify({ nom: m.nom, icone: m.icon, ordre: i + 1 }) }).then((r) => r.ok)
    ));
    if (ok.some(Boolean)) return getMatieres();
    return [];
  } catch { return []; }
}

/** Ajoute une matière. Renvoie l'id si OK. */
export async function ajouterMatiere(nom: string, icone = '📖'): Promise<string | null> {
  const token = await validToken();
  if (!token) return null;
  const propre = nom.trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!propre) return null;
  try {
    const res = await fetch(TABLE, { method: 'POST', headers: entetes(token), body: JSON.stringify({ nom: propre, icone: icone.slice(0, 4) }) });
    if (!res.ok) return null;
    const row = (await res.json())[0];
    return row?.id || null;
  } catch { return null; }
}

/** Supprime une matière. */
export async function supprimerMatiere(id: string): Promise<boolean> {
  const token = await validToken();
  if (!token) return false;
  try {
    const res = await fetch(`${TABLE}?id=eq.${id}`, { method: 'DELETE', headers: entetes(token) });
    if (!res.ok) return false;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch { return false; }
}