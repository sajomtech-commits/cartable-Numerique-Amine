// Petit dialogue de saisie (remplace prompt(), non supporté sur iPhone).
export function demanderTexte(titre: string, initial = ''): Promise<string | null> {
  return new Promise((resolve) => {
    const fond = document.createElement('div');
    fond.className = 'fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4';
    const carte = document.createElement('div');
    carte.className = 'carte w-full max-w-sm p-5';
    carte.innerHTML = `
      <p class="text-sm font-bold mb-2">${titre}</p>
      <input type="text" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm mb-3">
      <div class="flex gap-2 justify-end">
        <button data-non class="btn-doux text-xs">Annuler</button>
        <button data-oui class="btn-principal text-xs">Valider</button>
      </div>`;
    fond.appendChild(carte);
    document.body.appendChild(fond);
    const inp = carte.querySelector('input')!;
    inp.value = initial;
    setTimeout(() => { inp.focus(); inp.select(); }, 50);
    const fin = (v: string | null) => { fond.remove(); resolve(v); };
    carte.querySelector('[data-oui]')!.addEventListener('click', () => fin(inp.value));
    carte.querySelector('[data-non]')!.addEventListener('click', () => fin(null));
    fond.addEventListener('click', (e) => { if (e.target === fond) fin(null); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') fin(inp.value);
      if (e.key === 'Escape') fin(null);
    });
  });
}