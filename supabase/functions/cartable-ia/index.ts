// Edge Function Supabase : OCR vision + génération de fiche (API DeepSeek officielle)
// Clé API stockée ICI, côté serveur uniquement — jamais exposée au navigateur.
const DS_URL = 'https://api.deepseek.com/chat/completions';
const DS_KEY = Deno.env.get('DEEPSEEK_API_KEY') ?? 'sk-98d6f19d07894c0b8a8fe16944ade13d';
// deepseek-chat : lit les images (OCR des photos) et rédige les fiches.
const MODEL = 'deepseek-chat';

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
  const r = await fetch(DS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DS_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, messages: msgs, temperature: 0.3, max_tokens: maxTokens }),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`IA ${r.status}: ${txt.slice(0, 300)}`);
  const j = parseTolerant(txt);
  return j.choices?.[0]?.message?.content ?? '';
}

const JSON_FICHE = '{"titre":"...","resume":"...","pointsCles":["..."],"quiz":[{"q":"...","r":"..."}]}';

/** Matières vivantes : la fiche doit être une aide bilingue tournée vers le français. */
const LANGUES = ['anglais', 'espagnol', 'allemand', 'italien', 'portugais'];
const estLangue = (matiere: string) => LANGUES.includes(matiere.trim().toLowerCase());

const JSON_FICHE_LANGUE =
  '{"titre":"...","traduction":"...","resume":"...","vocabulaire":[{"mot":"...","fr":"..."}],"pointsCles":["..."],"quiz":[{"q":"...","r":"..."}]}';

/** Prompt pour les langues : traduction française + résumé + vocabulaire traduit. */
function promptLangue(matiere: string, texte: string) {
  return `Tu es un professeur de ${matiere} qui aide un élève FRANCOPHONE de 2nde.
Le texte ci-dessous est un cours (ou un document) rédigé en ${matiere}.
Produis une aide entièrement rédigée EN FRANÇAIS, en JSON valide uniquement, sans texte avant/après, au format exact :
${JSON_FICHE_LANGUE}

RÈGLES :
- "titre" : titre court de la leçon, en français.
- "traduction" : la TRADUCTION FIDÈLE EN FRANÇAIS de tout le texte du cours, en gardant sa structure (titres "## ", listes "- "). Ne résume PAS ici : traduis. C'est la partie la plus importante.
- "resume" : résumé de la leçon EN FRANÇAIS, découpé en 4 à 7 sections "## Titre court", 2 à 5 lignes courtes par section, puces "- ".
- "vocabulaire" : 10 à 20 mots ou expressions importants du texte, avec leur traduction française ("mot" = dans la langue étudiée, "fr" = en français).
- "pointsCles" : 5 à 8 points essentiels EN FRANÇAIS (grammaire, conjugaison, tournures, faux-amis), une phrase courte chacun.
- "quiz" : 4 à 6 questions EN FRANÇAIS, avec le mot ou la phrase en ${matiere} quand c'est utile, et leur réponse.
- N'invente rien qui ne soit pas dans le texte.

TEXTE DU COURS :
${texte.slice(0, 24000)}`;
}

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
        { role: 'user', content: estLangue(matiere) ? promptLangue(matiere, texte) : promptFiche(matiere, texte) },
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

    if (route === '/resume-chapitre') {
      const { matiere = 'Divers', titre = '', cours = [], fiches = [] } = body;
      if (!cours.length && !fiches.length) {
        return new Response(JSON.stringify({ error: 'aucun contenu fourni' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
      }
      const estL = estLangue(matiere);
      const prompt = `Tu es un professeur qui prépare une fiche de révision COMPLÈTE et SYNTHÉTIQUE pour un contrôle.
Matière : ${matiere}
Chapitre : ${titre}

Voici le contenu de ce chapitre (plusieurs cours et fiches de révision fusionnés) :

${cours.map((c: string, i: number) => `=== COURS ${i + 1} ===\n${c.slice(0, 12000)}`).join('\n\n')}
${fiches.map((f: string, i: number) => `=== FICHE ${i + 1} ===\n${f.slice(0, 6000)}`).join('\n\n')}

Produis UNE SEULE fiche de révision complète au format JSON pur, sans texte avant/après :
${estL ? JSON_FICHE_LANGUE : JSON_FICHE}

RÈGLES :
- C'est la FICHE ULTIME du chapitre : elle doit synthétiser TOUT le contenu sans répéter.
- Fusionne les informations identiques, élimine les doublons, garde l'essentiel.
- Le "resume" doit faire 6 à 10 sections, claires et aérées.
- ${estL ? '"traduction" : traduction fidèle de tout le chapitre en français.' : ''}
- ${estL ? '"vocabulaire" : 15 à 25 mots clés traduits.' : '"pointsCles" : 10 à 12 points essentiels.'}
- "quiz" : 6 à 8 questions de contrôle variées et représentatives du chapitre.`;

      const msgs: any[] = [
        { role: 'system', content: 'Tu réponds toujours en JSON pur, sans balise markdown.' },
        { role: 'user', content: prompt },
      ];
      let fiche: any = null;
      let derreur = '';
      for (let essai = 0; essai < 2 && !fiche; essai++) {
        let raw = await callIA(msgs, 8000);
        raw = raw.replace(/```json|```/g, '').trim();
        const first = raw.indexOf('{'), last = raw.lastIndexOf('}');
        if (first >= 0 && last > first) raw = raw.slice(first, last + 1);
        try { fiche = parseTolerant(raw); } catch (e) { derreur = String((e as Error).message || e); }
      }
      if (!fiche) {
        return new Response(JSON.stringify({ error: 'JSON invalide après 2 essais : ' + derreur.slice(0, 160) }), { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(fiche), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // Révision audio : script IA (DeepSeek) → MP3 (edge-tts via service Python)
    if (route === '/audio') {
      const { matiere = 'Divers', titre = '', cours = [], fiches = [], duree_min = 3, uid = '', chapitre = '', supabase_url = '' } = body;
      if (!uid) {
        return new Response(JSON.stringify({ error: 'uid manquant' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
      }
      const duree = Math.max(1, Math.min(8, Number(duree_min) || 3));
      const words = Math.round(duree * 130);
      const promptScript = `Tu es un professeur qui prépare une RÉVISION AUDIO pour un élève de 2nde.
Écris le script d'un monologue de révision de ~${duree} minutes (≈ ${words} mots), en français naturel PARLÉ (comme un prof qui explique à voix haute).
Thème : ${matiere} — ${titre}
CONTENU (cours et fiches) :
${cours.map((c: string, i: number) => `=== COURS ${i + 1} ===\n${c.slice(0, 8000)}`).join('\n\n')}
${fiches.map((f: string, i: number) => `=== FICHE ${i + 1} ===\n${f.slice(0, 4000)}`).join('\n\n')}

RÈGLES :
- Phrases courtes et claires, comme on parle réellement.
- Annonce les sections oralement : « D'abord, ... », « Passons à ... », « Un point important : ... ».
- Termine par 2-3 questions de contrôle avec leur réponse : « Question : ... Réponse : ... ».
- PAS de markdown, PAS de titres, PAS de puces : uniquement du texte parlé, séparé par des paragraphes.
- Garde l'essentiel que l'élève doit retenir, sans répétition.`;
      const msgs: any[] = [
        { role: 'system', content: 'Tu rédiges des scripts de révision audio : texte parlé uniquement, sans markdown.' },
        { role: 'user', content: promptScript },
      ];
      const script = (await callIA(msgs, 2000)).trim() || `Révision audio du chapitre ${titre}`;
      // TTS via le service Python (edge-tts), publié sur l'hôte
      const sk = Deno.env.get('SERVICE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      const su = (supabase_url || 'https://supabase.sagetech.vip').replace(/\/+$/, '');
      const candidats = ['http://192.168.1.51:8899', 'http://172.17.0.1:8899', 'http://host.docker.internal:8899', 'http://cartable-ia:8899'];
      let derreur = '';
      for (const base of candidats) {
        try {
          const r = await fetch(base + '/audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ script, uid, matiere, chapitre, supabase_url: su, service_key: sk }),
            signal: AbortSignal.timeout(120000),
          });
          const txt = await r.text();
          if (r.ok) {
            let j: any = {};
            try { j = JSON.parse(txt); } catch { j = { raw: txt.slice(0, 120) }; }
            return new Response(JSON.stringify({ ...j, script }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
          }
          derreur = `${base}: ${txt.slice(0, 120)}`;
        } catch (e) { derreur = `${base}: ${String(e).slice(0, 120)}`; }
      }
      return new Response(JSON.stringify({ error: 'TTS indisponible — ' + derreur }), { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'route inconnue', route }), { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[cartable-ia] erreur :', String((e as Error)?.message || e).slice(0, 300));
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
