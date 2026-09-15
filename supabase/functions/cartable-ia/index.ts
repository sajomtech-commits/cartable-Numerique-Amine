// Edge Function Supabase : OCR vision + génération de fiche (proxy vers OpenCode)
// Clé API stockée ICI, côté serveur uniquement — jamais exposée au navigateur.
const OC_URL = 'https://opencode.ai/zen/go/v1/chat/completions';
const OC_KEY = Deno.env.get('OC_KEY') ?? 'sk-QFiMOduwFxQlXo31gYBxSPeatU4QmZKhGkQrW3MGyTpKil0WOMAJDq0PAdXWQHRK';
const OC_SESSION = 'ses_cartable_persist';
// deepseek-flash : modèle natif multimodal (lit les photos pour l'OCR).
const MODEL = 'deepseek-flash';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

/** Répare un JSON où des caractères de contrôle bruts (retours à la ligne, tabulations)
 *  ont été glissés DANS une chaîne — cas fréquent des réponses d'IA (JSON invalide sinon). */
function reparationJSON(s: string): string {
  let out = '';
  let dansChaine = false;
  let echappe = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (echappe) { out += c; echappe = false; continue; }
    if (c === '\\') { out += c; echappe = true; continue; }
    if (c === '"') { dansChaine = !dansChaine; out += c; continue; }
    const code = c.charCodeAt(0);
    if (dansChaine && code < 0x20) {
      if (c === '\n') out += '\\n';
      else if (c === '\r') out += '\\r';
      else if (c === '\t') out += '\\t';
      else out += '\\u' + code.toString(16).padStart(4, '0');
      continue;
    }
    out += c;
  }
  return out;
}

/** JSON.parse tolérant : répare d'abord les caractères de contrôle illégaux. */
function parseTolerant(txt: string): any {
  try {
    return JSON.parse(txt);
  } catch (e) {
    const repare = reparationJSON(txt);
    if (repare !== txt) {
      console.log('[cartable-ia] JSON repare (caracteres de controle dans une chaine)');
      return JSON.parse(repare);
    }
    throw e;
  }
}

async function callIA(msgs: any[], maxTokens = 2600) {
  const r = await fetch(OC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OC_KEY}`,
      'x-opencode-session': OC_SESSION,
    },
    body: JSON.stringify({ model: MODEL, messages: msgs, temperature: 0.3, max_tokens: maxTokens }),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`IA ${r.status}: ${txt.slice(0, 300)}`);
  const j = parseTolerant(txt);
  return j.choices?.[0]?.message?.content ?? '';
}

const JSON_FICHE = '{"titre":"...","resume":"...","pointsCles":["..."],"quiz":[{"q":"...","r":"..."}]}';

function promptFiche(matiere: string, texte: string) {
  return `Tu es un professeur qui prépare des fiches de révision pour un élève de 2nde.
Matière : ${matiere}.
À partir du cours ci-dessous, produis une fiche de révision en FRANÇAIS, claire, aérée et facile à relire vite.
Réponds UNIQUEMENT en JSON valide, sans texte avant/après, au format exact :
${JSON_FICHE}

RÈGLES POUR "resume" (IMPORTANT — mise en page pour lecture à l'écran) :
- Découpe le cours en 4 à 7 SECTIONS. Chaque section commence par une ligne "## Titre court" (ex : "## Ce qu'il faut savoir", "## La formule", "## L'expérience de Fizeau").
- Sous chaque titre : 2 à 5 lignes courtes. UNE idée par ligne. Maximum 20 mots par ligne.
- Utilise des puces "- " pour les énumérations, les étapes et les formules.
- Mets une ligne VIDE entre chaque section et avant/après chaque liste.
- Chaque formule est SEULE sur sa ligne, précédée de "- " (ex : "- v = d / Δt").
- INTERDIT : les gros paragraphes compacts, les blocs de 5+ phrases collées.
- Écris les symboles en clair : ×, ≈, ⁻¹, μ, λ, Δt.
- Total : environ 20 à 30 lignes.

"pointsCles" : 5 à 8 points essentiels (formules, vocabulaire, méthodes), une phrase courte chacun.
"quiz" : 4 à 6 questions de contrôle avec leur réponse.

COURS :
${texte.slice(0, 24000)}`;
}

const OCR_PROMPT = `Transcris INTÉGRALEMENT en texte brut tout ce que tu vois sur cette image de cours (texte imprimé, manuscrit, formules, tableaux, légendes de schémas).
N'invente rien, ne résume pas, ne commente pas. Rends uniquement la transcription, en gardant les retours à la ligne et en écrivant les formules en clair (ex : v = d/t).`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = new URL(req.url);
  const route = url.pathname.replace(/^.*\/cartable-ia/, '') || '/';

  try {
    if (route === '/health' || route === '/') {
      return new Response(JSON.stringify({ ok: true, route, model: MODEL }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    const txtBody = await req.text();
    console.log(`[cartable-ia] ${route} - requete de ${txtBody.length} octets`);
    const body = JSON.parse(txtBody);

    if (route === '/fiche') {
      const { matiere = 'Divers', texte = '' } = body;
      if (texte.trim().length < 30) {
        return new Response(JSON.stringify({ error: 'texte trop court' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
      }
      const msgs: any[] = [
        { role: 'system', content: 'Tu réponds toujours en JSON pur, sans balise markdown, avec des chaînes sur une seule ligne (retours à la ligne écrits \\n).' },
        { role: 'user', content: promptFiche(matiere, texte) },
      ];
      let fiche: any = null;
      let derreur = '';
      for (let essai = 0; essai < 2 && !fiche; essai++) {
        let raw = await callIA(msgs, 6000);
        raw = raw.replace(/```json|```/g, '').trim();
        const first = raw.indexOf('{'), last = raw.lastIndexOf('}');
        if (first >= 0 && last > first) raw = raw.slice(first, last + 1);
        try {
          fiche = parseTolerant(raw);
        } catch (e) {
          derreur = String((e as Error).message || e);
          console.error('[cartable-ia] JSON de fiche invalide (essai ' + (essai + 1) + ') :', derreur.slice(0, 200));
          msgs.push({ role: 'assistant', content: raw.slice(0, 1500) });
          msgs.push({ role: 'user', content: 'Ce JSON est invalide (' + derreur.slice(0, 120) + '). Renvoie le même contenu en JSON VALIDE : aucune tabulation, aucun retour à la ligne brut dans les chaînes.' });
        }
      }
      if (!fiche) {
        return new Response(JSON.stringify({ error: 'JSON de fiche invalide après 2 essais : ' + derreur.slice(0, 160) }), { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(fiche), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    if (route === '/ocr') {
      const { images = [], prompt } = body;
      if (!Array.isArray(images) || images.length === 0) {
        return new Response(JSON.stringify({ error: 'images manquantes' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
      }
      let texte = '';
      for (const img of images.slice(0, 8)) {
        const content = [
          { type: 'text', text: prompt || OCR_PROMPT },
          { type: 'image_url', image_url: { url: img } },
        ];
        texte += (await callIA([{ role: 'user', content }], 4096)) + '\n\n';
      }
      return new Response(JSON.stringify({ texte: texte.trim() }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'route inconnue', route }), { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[cartable-ia] erreur :', String((e as Error)?.message || e).slice(0, 300));
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
