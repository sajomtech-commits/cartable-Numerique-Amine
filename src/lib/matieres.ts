// Référentiel des matières — source unique (partagée avec la future app collège).
// `couleur`  : classe Tailwind de fond (badge, pastille)
// `accent`   : classe Tailwind de texte
// `anneau`   : classe Tailwind d'anneau, pour les cartes colorées

export interface Matiere {
  slug: string;
  nom: string;
  icon: string;
  couleur: string;
  accent: string;
  anneau: string;
}

export const MATIERES: Matiere[] = [
  { slug: 'math',            nom: 'Maths',             icon: '📐', couleur: 'bg-violet-500',  accent: 'text-violet-300',  anneau: 'ring-violet-500/30' },
  { slug: 'francais',        nom: 'Français',          icon: '📚', couleur: 'bg-rose-500',    accent: 'text-rose-300',    anneau: 'ring-rose-500/30' },
  { slug: 'physique-chimie', nom: 'Physique-Chimie',   icon: '⚗️', couleur: 'bg-indigo-500',  accent: 'text-indigo-300',  anneau: 'ring-indigo-500/30' },
  { slug: 'svt',             nom: 'SVT',               icon: '🧬', couleur: 'bg-lime-500',    accent: 'text-lime-300',    anneau: 'ring-lime-500/30' },
  { slug: 'anglais',         nom: 'Anglais',           icon: '🇬🇧', couleur: 'bg-sky-500',     accent: 'text-sky-300',     anneau: 'ring-sky-500/30' },
  { slug: 'espagnol',        nom: 'Espagnol',          icon: '🇪🇸', couleur: 'bg-orange-500',  accent: 'text-orange-300',  anneau: 'ring-orange-500/30' },
  { slug: 'histoire-geo',    nom: 'Histoire-Géo',      icon: '🌍', couleur: 'bg-amber-500',   accent: 'text-amber-300',   anneau: 'ring-amber-500/30' },
  { slug: 'science-num',     nom: 'Science Numérique', icon: '💻', couleur: 'bg-cyan-500',    accent: 'text-cyan-300',    anneau: 'ring-cyan-500/30' },
  { slug: 'science-eco',     nom: 'Science Éco',       icon: '📊', couleur: 'bg-teal-500',    accent: 'text-teal-300',    anneau: 'ring-teal-500/30' },
  { slug: 'sport',           nom: 'Sport',             icon: '⚽', couleur: 'bg-emerald-500', accent: 'text-emerald-300', anneau: 'ring-emerald-500/30' },
];

/** Nom affiché d'une matière → slug (repli : minuscules). */
export function slugMatiere(nom: string): string {
  return MATIERES.find((m) => m.nom === nom)?.slug || nom.toLowerCase();
}

/** Trouve une matière par son nom affiché ou son slug. */
export function trouverMatiere(valeur: string): Matiere | undefined {
  return MATIERES.find((m) => m.nom === valeur || m.slug === valeur);
}

/** Icône d'une matière (repli 📖). */
export function iconeMatiere(nom: string): string {
  return trouverMatiere(nom)?.icon || '📖';
}
