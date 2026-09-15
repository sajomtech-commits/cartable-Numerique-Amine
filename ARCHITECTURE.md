# Architecture — Cartable Numérique

Vue technique de bout en bout, pour comprendre le système et pouvoir le dupliquer
(application collège).

## Vue d'ensemble

```
Navigateur (Astro statique)
   │  HTTPS
   ▼
Supabase (self-hosté, VPS)
   ├── Auth        : email / mot de passe → JWT
   ├── PostgREST   : /rest/v1/{chapitres,fiches,controles}  (RLS)
   ├── Storage     : fichiers de cours (bucket « amine » = déploiement, « cours » = à créer)
   └── Edge Function « cartable-ia »  ──► OpenCode (GLM) : OCR + génération de fiche
```

Le navigateur ne détient **aucune clé IA** : la clé OpenCode est lue par la
fonction Edge, côté serveur.

## Composants

| Composant | Emplacement | Rôle |
|---|---|---|
| Front | `src/` (Astro 5 + Tailwind v4) | Pages statiques + scripts client |
| Edge Function | `supabase/functions/cartable-ia/index.ts` | OCR vision + fiche IA (proxy OpenCode) |
| Edge Function | `supabase/functions/fiche-ia/index.ts` | Ping de santé OpenCode |
| Service annexe | `services/cartable-ia-proxy/app.py` | Ancien proxy Python (port 8899, tunnel Cloudflare) — **legacy** |
| Base | `supabase/migrations/` | Schéma versionné (tables, RLS, policies) |

## Flux « photo/PDF → fiche »

1. **Sélection** du fichier (photo appareil, galerie ou PDF) dans `src/pages/fiche.astro`.
2. **Lecture** :
   - PDF texte → extraction locale via `pdfjs-dist` ;
   - PDF scanné / photo → rendu en image puis **OCR** via `POST /functions/v1/cartable-ia/ocr`.
3. **Génération** : `POST /functions/v1/cartable-ia/fiche` → `{titre, resume, pointsCles, quiz}`.
4. **Chapitre** : choisi dans la liste ou créé à la volée (`src/lib/chapitres.ts`).
5. **Sauvegarde** de la fiche dans `public.fiches` (`src/lib/fiches.ts`).

## Modèle de données

- `chapitres` — `matiere, numero, titre` ; `user_id` **NULL = chapitre du programme (partagé)**,
  sinon chapitre personnel. Contrainte unique `(matiere, titre)`.
- `fiches` — fiche d'un élève : `titre, resume, points_cles (jsonb), quiz (jsonb),
  source_type, source_contenu, matiere, chapitre_id`.
- `controles` — résultat d'un quiz : `fiche_id, score, total, details (jsonb)`.

RLS activée partout :
- `fiches` / `controles` : strictement privées (`auth.uid() = user_id`) ;
- `chapitres` : **lecture publique** (programme partagé), écriture par le propriétaire.

## Déploiement

1. `SITE_BASE=/ SITE_URL=https://amine.sagetech.vip npm run build` → `dist/`.
   (le `.env` doit exister : `cp .env.example .env`)
2. Empaqueter : `tar czf site.tar.gz -C dist .`
3. Déposer l'archive dans le bucket Storage `amine` sous le nom `site.tar.gz`
   (`POST /storage/v1/object/amine/site.tar.gz`, en-tête `x-upsert: true`,
   avec la clé service_role — le bucket n'a pas de policy d'écriture publique).
4. Redémarrer le service Coolify `amine-site` :
   `POST /api/v1/services/{uuid}/restart` — au démarrage, `start.sh` retélécharge
   l'archive dans nginx.

GitHub Pages est aussi cible via `.github/workflows/deploy.yml` (base `/cartable-Numerique-Amaine`).

### Fonction Edge (IA)

Le code versionné (`supabase/functions/cartable-ia/index.ts`) doit être copié sur
le VPS dans `/data/coolify/services/<uuid-supabase>/volumes/functions/cartable-ia/index.ts`
(volume monté dans le conteneur `supabase-edge-functions`). Le runtime **recharge à chaud**
(visible via `GET /functions/v1/cartable-ia/health`). Modèle actuel : `deepseek-flash`
(vision → OCR + génération de fiche), servi par la passerelle OpenCode.


## Points de vigilance

- ⚠️ **Clé OpenCode en dur** dans `supabase/functions/cartable-ia/index.ts`
  (fallback de `Deno.env.get('OC_KEY')`). À terme : la mettre uniquement en variable
  d'environnement Coolify et supprimer le fallback.
- ⚠️ `src/pages/test.astro` est une page de diagnostic **publiquement accessible** :
  à retirer (ou protéger) avant l'ouverture au collège.
- ⚠️ `updated_at` sur `fiches` n'était pas maintenu (aucun trigger) — corrigé par
  la migration `0001`.
