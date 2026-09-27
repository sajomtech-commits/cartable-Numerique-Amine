# ATELIER — Site Dessin Extraordinaire

Site public **ultra qualitatif** pour exposer tes dessins. 100% statique, prêt pour **GitHub Pages**. Aucune base de données, ajout en 30 secondes.

## ✨ Ce que tu as

- **Hero éditorial** papier / lumière — typographie Cormorant + Instrument Serif, vibe galerie parisienne
- **Galerie masonry fluide** (3 colonnes → 1 sur mobile), hover doux, filtres instantanés
- **Albums hyper modernes** : scroll horizontal snap (comme Apple Photos), clic = filtre galerie
- **Lightbox immersive** : plein écran, blur, navigation clavier / swipe / flèches, zoom
- **Navigation fluide** : smooth scroll, sticky nav glass, section active, reveals au scroll
- **Responsive** : mobile impeccable, burger menu, tactile
- **Ultra léger** : HTML/CSS/JS vanilla, pas de build, pas de dépendances

## 📁 Structure

```
dessin-site/
├── index.html
├── assets/
│   ├── css/style.css
│   └── js/app.js
├── data/
│   └── drawings.js   ← TU AJOUTES TES DESSINS ICI
└── README.md
```

## ➕ Ajouter un dessin (30s)

1. Ouvre `data/drawings.js`
2. Copie un bloc `{ ... },` et colle-le en haut de la liste
3. Change :
```js
{
  id: "013",
  title: "Mon nouveau dessin",
  album: "Visages", // Visages | Encres Nocturnes | Carnet de Voyage | Abstractions (ou crée le tien)
  technique: "Fusain • A3",
  annee: "2025",
  format: "A3 • 42×29cm",
  image: "assets/img/mon-dessin.jpg", // ou URL https://...
  thumb: "assets/img/mon-dessin-thumb.jpg",
  desc: "Quelques mots sur le geste.",
  couleur: "nb"
}
```
4. Mets ton image dans `assets/img/` (ou utilise une URL)
5. **Push sur GitHub → la galerie se met à jour automatiquement**

> Tu peux aussi ajouter un nouvel album dans `ALBUMS` au même fichier.

## 🚀 Déployer sur GitHub Pages (2 min)

**Option simple (recommandée) :**

1. Crée un repo GitHub public : `ton-pseudo.github.io` OU `atelier-dessin`
2. Uploade tout le contenu de `dessin-site/` à la racine du repo
3. Sur GitHub : `Settings → Pages → Source : Deploy from a branch → branch: main / root (ou /docs)`
4. Ton site est en ligne : `https://ton-pseudo.github.io/atelier-dessin/`

**En local :** double-clique sur `index.html` — ça marche sans serveur.

## 🎨 Personnaliser

- **Couleurs/papier** : édite `:root` dans `assets/css/style.css` (`--bg`, `--ink`, `--accent2`)
- **Typo** : change l'import Google Fonts en haut du CSS
- **Texte hero / bio** : édite directement `index.html` (sections `hero` et `studio`)
- **Contact** : remplace `atelier@dessin.fr` et le `onsubmit` du formulaire par ton lien [Formspree](https://formspree.io/) pour recevoir les messages

## 🔍 SEO & Partage

Meta description + Open Graph déjà en place. Change le titre dans `<title>` et la description si tu veux.

## 📸 Conseils photos

- Photographie en lumière naturelle, sans flash
- Recadre serré, fond blanc/papier visible
- Exporte en `1200px` large côté long, qualité 80%, `thumb` en `600px`

---

Fait pour durer. Papier, trait, vide.
