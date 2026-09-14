// IA via Edge Function Supabase (HTTPS, même domaine que l'app) — plus de RPC/pg_net, plus d'IP locale.
// La clé OpenCode reste côté serveur (dans la fonction edge), jamais exposée au navigateur.
const BASE = (import.meta.env.PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const ANON = import.meta.env.PUBLIC_SUPABASE_KEY || '';
const IA_URL = `${BASE}/functions/v1/cartable-ia`;

export interface Fiche {
  titre: string;
  resume: string;
  pointsCles: string[];
  quiz: { q: string; r: string }[];
}

async function post(route: string, payload: unknown, timeoutMs = 180000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${IA_URL}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(`IA ${res.status} — ${txt.slice(0, 200)}`);
    try {
      return JSON.parse(txt);
    } catch {
      throw new Error('Réponse IA illisible — ' + txt.slice(0, 200));
    }
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error("L'IA met trop de temps (réessaie avec un PDF plus court).");
    if (e instanceof TypeError) throw new Error('Connexion au service IA impossible — vérifie ta connexion.');
    throw e;
  } finally {
    clearTimeout(t);
  }
}

/** Génère une fiche de révision à partir du texte du cours. */
export async function genererFiche(texte: string, matiere: string): Promise<Fiche> {
  const j = await post('/fiche', { texte, matiere });
  if (j.error) throw new Error(j.error);
  return {
    titre: j.titre || 'Fiche',
    resume: j.resume || '',
    pointsCles: Array.isArray(j.pointsCles) ? j.pointsCles : [],
    quiz: Array.isArray(j.quiz) ? j.quiz : [],
  };
}

/** OCR d'une seule page (image base64) — utilisé par la prise de photo, page par page. */
export async function ocrImage(image: string): Promise<string> {
  const j = await post('/ocr', { images: [image] }, 180000);
  if (j.error) throw new Error(j.error);
  return (j.texte || '').trim();
}

/** OCR : lit une ou plusieurs pages (images base64) et renvoie le texte du cours. */
export async function ocrImages(images: string[]): Promise<string> {
  const j = await post('/ocr', { images }, 300000);
  if (j.error) throw new Error(j.error);
  return (j.texte || '').trim();
}
