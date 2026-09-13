// Rendu lisible et aéré d'un résumé de fiche (titres "## ", puces "- ", formules, lignes vides)
export function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const gras = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>');

/** Une ligne est une formule si elle contient = ou ≈ et ressemble à une égalité courte. */
function estFormule(t: string): boolean {
  if (!/[=≈]/.test(t)) return false;
  if (t.length > 90) return false;
  const mots = t.trim().split(/\s+/).length;
  return mots <= 12;
}

/** Transforme le résumé texte en HTML structuré : sections, puces, formules isolées. */
export function resumeHTML(texte: string): string {
  const lignes = String(texte ?? '').split('\n');
  const out: string[] = [];
  let listeOuverte = false;

  const fermerListe = () => {
    if (listeOuverte) {
      out.push('</ul>');
      listeOuverte = false;
    }
  };

  for (const brute of lignes) {
    const l = brute.trim();
    if (!l) continue; // ligne vide : on ne ferme PAS la liste (les puces sont souvent espacées)

    if (l.startsWith('### ') || l.startsWith('## ')) {
      fermerListe();
      const [balise, taille, marge] = l.startsWith('### ')
        ? ['h4', 'text-[13px] font-bold text-slate-100', 'mt-3 mb-1']
        : ['h3', 'text-base font-bold text-brand', 'mt-6 mb-2 pb-1 border-b border-slate-800'];
      out.push(`<${balise} class="${taille} ${marge}">${esc(l.replace(/^#+\s*/, ''))}</${balise}>`);
      continue;
    }

    const estPuce = /^([-•*])\s+/.test(l);
    if (estPuce) {
      const contenu = l.replace(/^([-•*])\s+/, '');
      if (!listeOuverte) {
        out.push('<ul class="space-y-1.5 my-2">');
        listeOuverte = true;
      }
      out.push(
        estFormule(contenu)
          ? `<li class="text-slate-100 bg-slate-950 ring-1 ring-slate-800 rounded-lg px-3 py-2 font-mono text-[13px]">${gras(contenu)}</li>`
          : `<li class="text-sm text-slate-200 leading-relaxed pl-4 relative"><span class="absolute left-0 text-brand">•</span>${gras(contenu)}</li>`
      );
      continue;
    }

    fermerListe();
    out.push(
      estFormule(l)
        ? `<p class="text-slate-100 bg-slate-950 ring-1 ring-slate-800 rounded-lg px-3 py-2 font-mono text-[13px] my-2 text-center">${gras(l)}</p>`
        : `<p class="text-sm text-slate-200 leading-relaxed my-2">${gras(l)}</p>`
    );
  }
  fermerListe();
  return out.join('');
}
