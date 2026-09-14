// Chapitres par matière : programme officiel (partagé) + chapitres créés par Amine
import { validToken } from './auth';

export interface Chapitre {
  id: string;
  titre: string;
  numero: number | null;
  perso: boolean;
}

const URL = import.meta.env.PUBLIC_SUPABASE_URL || '';
const KEY = import.meta.env.PUBLIC_SUPABASE_KEY || '';
const TABLE = `${URL}/rest/v1/chapitres`;

/** Nom affiché d'une matière → slug utilisé dans la table `chapitres`. */
export const SLUGS: Record<string, string> = {
  'Maths': 'math',
  'Français': 'francais',
  'Physique-Chimie': 'physique-chimie',
  'SVT': 'svt',
  'Anglais': 'anglais',
  'Espagnol': 'espagnol',
  'Histoire-Géo': 'histoire-geo',
  'Science Numérique': 'science-num',
  'Science Éco': 'science-eco',
  'Sport': 'sport',
};

/** slug → nom affiché (pour les pages matières). */
export const NOMS: Record<string, string> = {
  'math': 'Maths',
  'francais': 'Français',
  'physique-chimie': 'Physique-Chimie',
  'svt': 'SVT',
  'anglais': 'Anglais',
  'espagnol': 'Espagnol',
  'histoire-geo': 'Histoire-Géo',
  'science-num': 'Science Numérique',
  'science-eco': 'Science Éco',
  'sport': 'Sport',
};

export const slugMatiere = (nom: string): string => SLUGS[nom] || nom.toLowerCase();

function entetes(token: string): HeadersInit {
  return {
    apikey: KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

/** Normalise un titre pour comparer deux chapitres saisis différemment. */
const norm = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Chapitres disponibles pour une matière (nom affiché ou slug) :
 * programme officiel + chapitres créés par l'élève.
 */
export async function getChapitres(matiere: string): Promise<Chapitre[]> {
  const token = await validToken();
  if (!token) return [];
  const slug = slugMatiere(matiere);
  const q =
    'select=id,titre,numero,user_id&' +
    `or=(matiere.eq.${encodeURIComponent(slug)},matiere.eq.${encodeURIComponent(matiere)})&` +
    'order=numero.asc.nullslast,titre.asc&limit=400';
  try {
    const res = await fetch(`${TABLE}?${q}`, { headers: entetes(token) });
    if (!res.ok) return [];
    const rows = await res.json();
    return (rows as any[]).map((r) => ({
      id: r.id,
      titre: r.titre as string,
      numero: (r.numero ?? null) as number | null,
      perso: !!r.user_id,
    }));
  } catch {
    return [];
  }
}

/** Crée un chapitre personnel. Si un chapitre du même nom existe déjà, il est renvoyé. */
export async function creerChapitre(matiere: string, titre: string): Promise<Chapitre | null> {
  const token = await validToken();
  if (!token) return null;
  const propre = titre.trim().replace(/\s+/g, ' ').slice(0, 120);
  if (!propre) return null;
  const res = await fetch(TABLE, {
    method: 'POST',
    headers: entetes(token),
    body: JSON.stringify({ matiere: slugMatiere(matiere), titre: propre }),
  });
  if (res.ok) {
    const r = (await res.json())[0];
    return { id: r.id, titre: r.titre, numero: r.numero ?? null, perso: true };
  }
  // 409 : le chapitre existe déjà (même matière + même titre) → on le récupère
  const existants = await getChapitres(matiere);
  return existants.find((c) => norm(c.titre) === norm(propre)) || null;
}

/** Supprime un chapitre personnel (impossible pour un chapitre du programme). */
export async function supprimerChapitre(id: string): Promise<boolean> {
  const token = await validToken();
  if (!token) return false;
  const res = await fetch(`${TABLE}?id=eq.${id}`, { method: 'DELETE', headers: entetes(token) });
  return res.ok;
}

/** Retrouve un chapitre par son titre (insensible à la casse/accents), sinon le crée. */
export async function trouverOuCreer(matiere: string, titre: string): Promise<Chapitre | null> {
  const propre = titre.trim();
  if (!propre) return null;
  const existants = await getChapitres(matiere);
  const trouve = existants.find((c) => norm(c.titre) === norm(propre));
  if (trouve) return trouve;
  return creerChapitre(matiere, propre);
}
