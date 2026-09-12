// Client IA — opencode Go (Z.AI GLM via OpenCode)
// Environnement navigateur : la clé est stockée dans localStorage (jamais dans le repo).
const BASE_URL = 'https://opencode.ai/zen/go/v1';
const MODEL = 'glm-4.5-air';

export function getApiKey(): string {
  return (typeof document !== 'undefined' ? localStorage.getItem('oc_key') : '') || '';
}

export async function chat(messages: { role: string; content: string }[], maxTokens = 1200): Promise<string> {
  const key = getApiKey();
  if (!key) throw new Error('Clé API manquante — va dans Réglages.');
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'x-opencode-session': `cartable-amine-${Date.now()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature: 0.3 }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error?.message || res.statusText);
  const c = j?.choices?.[0]?.message;
  return c?.content || c?.reasoning_content || '';
}

export interface FicheResult {
  titre: string;
  resume: string;
  pointsCles: string[];
  quiz: { q: string; r: string }[];
}

export function parseFiche(md: string): FicheResult {
  const titre = (md.match(/##\s*TITRE\s*:\s*(.+)/i)?.[1] || 'Cours').trim();
  const resumeBlock = md.split(/##\s*RESUME/i)[1]?.split(/^##\s+/m)[0]?.trim() || '';
  const points = md.split(/##\s*POINTS CLES/i)[1]?.split(/^##\s+/m)[0]
    ?.split('\n').map((l) => l.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean) || [];
  const quizRaw = md.split(/##\s*QUIZ/i)[1]?.trim() || '';
  const quiz: { q: string; r: string }[] = [];
  // format attendu : **Q:** question **R:** réponse
  const re = /\*\*Q:\*\*\s*(.+?)\s*\*\*R:\*\*\s*(.+?)(?=\*\*Q:|$)/gs;
  for (const m of quizRaw.matchAll(re)) quiz.push({ q: m[1].trim(), r: m[2].trim() });
  return { titre, resume: resumeBlock, pointsCles: points, quiz };
}

export async function genererFiche(texte: string, matiere: string): Promise<FicheResult> {
  const prompt = `Tu es un professeur de lycée en France. À partir du cours de ${matiere} ci-dessous, produis une fiche de révision au format EXACT suivant (markdown) :

## TITRE: <titre du chapitre>
## RESUME
<3 à 4 phrases claires>
## POINTS CLES
- <10 points max, un par ligne>
## QUIZ
**Q:** <question de contrôle type> **R:** <réponse courte>
(4 Q/R)

COURS:
${texte.slice(0, 12000)}`;
  const out = await chat([{ role: 'user', content: prompt }], 1500);
  return { ...parseFiche(out), brut: out } as any;
}
