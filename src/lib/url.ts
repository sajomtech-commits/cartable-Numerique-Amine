// Liens internes robustes quelle que soit la base du site.
//  base '/' (amine.sagetech.vip)                -> '/revisions'
//  base '/cartable-Numerique-Amine' (GH Pages)  -> '/cartable-Numerique-Amaine/revisions'
// Sans ce garde-fou, une base '/' produit '//revisions' : URL protocol-relative
// que le navigateur interprète comme un autre domaine (lien cassé).
export const racine = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') || '/';

export const lien = (chemin: string): string => {
  const c = String(chemin).replace(/^\/+/, '');
  return racine === '/' ? '/' + c : racine + '/' + c;
};
