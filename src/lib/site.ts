// Config du site — personnalisable par déploiement via les variables public*.
// Ex. : PUBLIC_SITE_NOM="Cartable de Mayssa" dans le .env avant le build.
export const SITE_NOM: string = import.meta.env.PUBLIC_SITE_NOM || 'Cartable';
export const SITE_TAGLINE: string = import.meta.env.PUBLIC_SITE_TAGLINE || "L'école simplement";