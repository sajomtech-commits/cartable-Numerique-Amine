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
  /** Matières vivantes : traduction française du cours. */
  traduction?: string;
  /** Matières vivantes : vocabulaire traduit (langue → français). */
  vocabulaire?: { mot: string; fr: string }[];
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
    if (!res.ok) {
      let msg = txt.slice(0, 200);
      try { const j = JSON.parse(txt); if (j?.error) msg = String(j.error); } catch { /* corps non JSON */ }
      if (res.status >= 500) {
        throw new Error(`Le service IA a eu un souci passager (${res.status}). Le cours est déjà lu : reclique sur « ✨ Générer la fiche ». [${msg.slice(0, 120)}]`);
      }
      throw new Error(`IA ${res.status} — ${msg}`);
    }
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
    traduction: typeof j.traduction === 'string' ? j.traduction : '',
    vocabulaire: Array.isArray(j.vocabulaire)
      ? j.vocabulaire
          .map((v: any) => ({ mot: String(v?.mot ?? v?.[0] ?? '').trim(), fr: String(v?.fr ?? v?.[1] ?? '').trim() }))
          .filter((v: { mot: string; fr: string }) => v.mot && v.fr)
      : [],
  };
}

/** Résumé complet d'un chapitre (fusion de tous les cours + fiches). */
export async function resumeChapitre(matiere: string, titre: string, cours: string[], fichesTextes: string[]): Promise<Fiche> {
  const j = await post('/resume-chapitre', { matiere, titre, cours, fiches: fichesTextes }, 240000);
  if (j.error) throw new Error(j.error);
  return {
    titre: j.titre || titre,
    resume: j.resume || '',
    pointsCles: Array.isArray(j.pointsCles) ? j.pointsCles : [],
    quiz: Array.isArray(j.quiz) ? j.quiz : [],
    traduction: typeof j.traduction === 'string' ? j.traduction : '',
    vocabulaire: Array.isArray(j.vocabulaire) ? j.vocabulaire : [],
  };
}

/** Révision audio : script IA + MP3. Le path est dans le bucket privé « audio ». */
export interface AudioGenere { script: string; path: string; duree_sec: number; }
export async function genererAudio(payload: {
  matiere: string; titre: string; cours: string[]; fiches: string[];
  duree_min: number; uid: string; chapitre: string;
}): Promise<AudioGenere> {
  // 380 s < wall-clock 400 s du runtime edge (main/index.ts workerTimeoutMs)
  const j = await post('/audio', payload, 380000);
  if (j.error) throw new Error(j.error);
  return { script: j.script || '', path: j.path || '', duree_sec: j.duree_sec || 0 };
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
