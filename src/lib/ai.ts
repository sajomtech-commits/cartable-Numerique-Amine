// IA via Supabase RPC (la clé ne quitte jamais le serveur)
import { validToken } from './auth';

const BASE = import.meta.env.PUBLIC_SUPABASE_URL || '';
const ANON = import.meta.env.PUBLIC_SUPABASE_KEY || '';

export interface FicheResult {
  titre: string;
  resume: string;
  pointsCles: string[];
  quiz: { q: string; r: string }[];
}

export function parseFiche(md: string): FicheResult {
  const titre = (md.match(/##\s*TITRE:\s*(.+)/i)?.[1] || 'Cours').trim();
  const resumeBlock = md.split(/##\s*RESUME/i)[1]?.split(/^##\s+/m)[0]?.trim() || '';
  const points = md.split(/##\s*POINTS CLES/i)[1]?.split(/^##\s+/m)[0]
    ?.split('\n').map((l) => l.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean) || [];
  const quizRaw = md.split(/##\s*QUIZ/i)[1]?.trim() || '';
  const quiz: { q: string; r: string }[] = [];
  const re = /\*\*Q:\*\*\s*(.+?)\s*\*\*R:\*\*\s*(.+?)(?=\*\*Q:|$)/gs;
  for (const m of quizRaw.matchAll(re)) quiz.push({ q: m[1].trim(), r: m[2].trim() });
  return { titre, resume: resumeBlock, pointsCles: points, quiz };
}

function headers(token: string): HeadersInit {
  return { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function genererFiche(texte: string, matiere: string): Promise<FicheResult> {
  // 1) token utilisateur obligatoire
  const token = await validToken();
  if (!token) throw new Error('Session expirée — reconnecte-toi.');

  // 2) créer le job
  let res = await fetch(`${BASE}/rest/v1/fiches_jobs?select=id`, {
    method: 'POST', headers: { ...headers(token), Prefer: 'return=representation' },
    body: JSON.stringify({ matiere, texte }),
  });
  if (!res.ok) throw new Error(`Création du job échouée (${res.status})`);
  const jobId = (await res.json())[0].id as string;

  // 3) déclencher + récupérer (la clé IA reste côté serveur)
  for (const rpc of ['lancer_ia', 'recuperer_ia']) {
    const rr = await fetch(`${BASE}/rest/v1/rpc/${rpc}`, {
      method: 'POST', headers: headers(token), body: JSON.stringify({}),
    });
    if (!rr.ok) throw new Error(`RPC ${rpc} a échoué (${rr.status})`);
  }

  // 4) poll du job (~30 s max)
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 4000));
    res = await fetch(`${BASE}/rest/v1/fiches_jobs?id=eq.${jobId}&select=statut,resultat,erreur`, {
      headers: headers(token),
    });
    const job = (await res.json())[0];
    if (job.statut === 'fait') {
      const md = JSON.parse(job.resultat)?.choices?.[0]?.message?.content || '';
      const parsed = parseFiche(md);
      if (!parsed.quiz.length) throw new Error('Réponse IA inattendue — réessaie.');
      return parsed;
    }
    if (job.statut === 'erreur') throw new Error('Erreur IA : ' + (job.erreur || 'réessaie'));
  }
  throw new Error('Délai dépassé — réessaie dans une minute.');
}
