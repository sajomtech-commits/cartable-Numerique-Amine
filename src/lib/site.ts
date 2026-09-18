// Config du site — personnalisable par déploiement via les variables public*.
// Ex. : PUBLIC_SITE_NOM="Cartable de Mayssa" dans le .env avant le build.
export const SITE_NOM: string = import.meta.env.PUBLIC_SITE_NOM || 'Cartable';
export const SITE_TAGLINE: string = import.meta.env.PUBLIC_SITE_TAGLINE || "L'école simplement";

/** Prénom affiché proprement (première lettre en capitale). */
export function joliPrenom(prenom: string): string {
  const p = prenom.trim();
  if (!p) return '';
  return p.charAt(0).toUpperCase() + p.slice(1);
}

/** « Cartable d'Amine » / « Cartable de Mayssa » : nom du site adapté au prénom connecté. */
export function nomSitePrenom(prenom: string): string {
  const p = joliPrenom(prenom);
  if (!p) return SITE_NOM;
  const l = p.charAt(0).toLowerCase();
  return /^[aeiouyh]$/.test(l) ? `Cartable d'${p}` : `Cartable de ${p}`;
}