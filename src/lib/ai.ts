// IA via proxy VPS (OCR + fiche) — plus de RPC/pg_net
import { validToken } from './auth';

const PROXY = 'http://192.168.1.51:8899';
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

async function proxyPost(route: string, body: any): Promise<any> {
  const res = await fetch(`${PROXY}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({ erreur: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(j.erreur || `Proxy ${res.status}`);
  return j;
}

// OCR vision : images (dataURL) -> texte
export async function ocrImages(images: string[]): Promise<string> {
  const j = await proxyPost('/ocr', { images });
  return j.texte as string;
}

// texte -> fiche (parse la réponse markdown)
export async function genererFiche(texte: string, matiere: string): Promise<FicheResult> {
  const j = await proxyPost('/fiche', { matiere, texte: texte.slice(0, 15000) });
  const parsed = parseFiche(j.markdown || '');
  if (!parsed.quiz.length) throw new Error('Réponse IA inattendue — réessaie.');
  return parsed;
}

export { headers };
