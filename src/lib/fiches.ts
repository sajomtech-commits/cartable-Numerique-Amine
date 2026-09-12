// Fiches de révision — stockage local (localStorage) par matière
export interface Fiche {
  id: string;
  matiere: string;
  titre: string;
  resume: string;
  pointsCles: string[];
  quiz: { q: string; r: string }[];
  date: string;
}

const KEY = 'cartable_fiches';

export function getFiches(): Fiche[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function saveFiche(f: Omit<Fiche, 'id' | 'date'>): Fiche {
  const fiches = getFiches();
  const full: Fiche = { ...f, id: crypto.randomUUID(), date: new Date().toISOString() };
  fiches.unshift(full);
  localStorage.setItem(KEY, JSON.stringify(fiches));
  return full;
}

export function deleteFiche(id: string) {
  localStorage.setItem(KEY, JSON.stringify(getFiches().filter((f) => f.id !== id)));
}

export function fichesParMatiere(matiere: string): Fiche[] {
  return getFiches().filter((f) => f.matiere === matiere);
}
