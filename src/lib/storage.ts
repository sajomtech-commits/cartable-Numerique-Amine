// Stockage des cours (PDF / photos) — bucket privé « cours », rangé par matière/chapitre.
// Convention de chemin : {user_id}/{matiere}/{chapitre}/{horodatage}-{nom}
// La policy Supabase n'autorise l'accès qu'au dossier = uid de l'utilisateur connecté.
import { validToken, userID } from './auth';

const URL = (import.meta.env.PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = import.meta.env.PUBLIC_SUPABASE_KEY || '';
export const BUCKET = 'cours';

export type TypeFichier = 'pdf' | 'photo';

export interface FichierCours {
  path: string;   // chemin dans le bucket
  nom: string;    // nom d'origine
  type: TypeFichier;
  taille: number; // octets
}

/** Rend une chaîne utilisable comme dossier : sans accent, sans espace, en minuscules. */
export function slug(s: string, defaut = 'divers'): string {
  const r = String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return r || defaut;
}

/** Extension de fichier sûre (pdf, jpg, png, webp…) à partir du nom / type MIME. */
function extension(file: File): string {
  const m = (file.name || '').match(/\.([a-z0-9]{1,5})$/i);
  if (m) return m[1].toLowerCase();
  const t = (file.type || '').split('/')[1] || '';
  return (t.replace(/[^a-z0-9]/gi, '') || 'bin').toLowerCase();
}

/**
 * Envoie un fichier de cours dans le bucket privé, rangé `matière / chapitre`.
 * Renvoie les métadonnées à stocker sur la fiche.
 */
export async function envoyerCours(
  file: File, matiere: string, chapitre: string, type: TypeFichier
): Promise<FichierCours> {
  const token = await validToken();
  const uid = userID();
  if (!token || !uid) throw new Error('Non connecté');

  const base = (file.name || 'cours').replace(/\.[a-z0-9]{1,5}$/i, '');
  const nom = `${Date.now()}-${slug(base, 'cours')}.${extension(file)}`;
  const path = `${uid}/${slug(matiere)}/${slug(chapitre, 'sans-chapitre')}/${nom}`;

  const res = await fetch(`${URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'false',
    },
    body: file,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Envoi du cours échoué (${res.status})${txt ? ' — ' + txt.slice(0, 120) : ''}`);
  }
  return { path, nom: file.name || nom, type, taille: file.size };
}

/** Lien signé temporaire vers un cours stocké (bucket privé). */
export async function lienCours(path: string, expires = 3600, telecharger = false): Promise<string | null> {
  const token = await validToken();
  if (!token || !path) return null;
  try {
    const res = await fetch(`${URL}/storage/v1/object/sign/${BUCKET}/${path}`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: expires }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    if (!j?.signedURL) return null;
    return `${URL}/storage/v1${j.signedURL}${telecharger ? '&download=' : ''}`;
  } catch { return null; }
}

/** Supprime un cours stocké. */
export async function supprimerCours(path: string): Promise<boolean> {
  const token = await validToken();
  if (!token || !path) return false;
  const res = await fetch(`${URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'DELETE',
    headers: { apikey: KEY, Authorization: `Bearer ${token}` },
  });
  return res.ok;
}
