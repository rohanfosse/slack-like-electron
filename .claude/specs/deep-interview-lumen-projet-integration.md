---
subject: Lumen v2.33 — Intégration bidirectionnelle chapitre ↔ projet Cursus
type: brownfield
rounds: 8
ambiguity: 10.75%
created: 2026-04-11
---

# Specification : Lumen ↔ Projet Cursus (bidirectionnel)

## Scores de clarté finaux

| Dimension | Score | Poids | Contribution |
|---|---|---|---|
| Objectif | 0.95 | 35% | 0.3325 |
| Contraintes | 0.85 | 25% | 0.2125 |
| Critères de succès | 0.85 | 25% | 0.2125 |
| Contexte (brownfield) | 0.9 | 15% | 0.135 |
| **Total clarté** | | | **0.8925** |
| **Ambiguïté résiduelle** | | | **10.75%** |

## Objectif

Brancher Lumen dans le flux pédagogique réel de l'étudiant en reliant chaque repo de cours à un **projet Cursus**. L'étudiant n'a plus à "aller chercher les cours" — ils apparaissent dans le contexte de son projet. Réciproquement, depuis un chapitre Lumen, il peut rejoindre en un clic le canal du projet concerné. Lumen passe de **"liseuse parmi d'autres"** à **"hub pédagogique intégré au parcours"**.

**Cette intégration est le petit lien qui, à lui seul, change la perception de Lumen au pilote CESI septembre 2026.** Elle remplace la direction "enrichir le rendu markdown" qui était une projection de l'anxiété d'auteur plutôt qu'un vrai besoin étudiant.

## Contraintes

### Déclaration et résolution
- **Source canonique = `cursus.yaml`**. Nouveau champ optionnel `project: "Nom du projet"` au niveau racine du manifest. Au sync, le backend résout par matching case-insensitive + trim contre `projects.name` dans la promo courante et écrit `lumen_repos.project_id`.
- **UI fallback** : depuis la vue d'un projet Cursus (teacher/admin uniquement), un bouton "Lier un repo Lumen" permet de choisir manuellement dans la liste des repos de la promo non encore liés. Écrit en DB directement. **Si un manifest déclare déjà un `project:`, il gagne** (le bouton est désactivé avec tooltip "déjà lié via cursus.yaml").
- **Une seule relation par repo** (cardinalité 1:N : un projet peut avoir plusieurs repos Lumen, un repo appartient à au plus un projet).
- **Périmètre promo** : le matching et l'UI ne listent que les projets de la promo du repo. Pas de cross-promo.
- **Colonne DB existe déjà** : `lumen_repos.project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL` créée dans la migration v56. Pas de nouvelle migration.
- **Échec silencieux avec feedback** : si le `project:` du manifest ne matche aucun projet, on écrit l'erreur dans `lumen_repos.manifest_error` ("Projet \"X\" introuvable dans la promo \"Y\""), le sync continue, `project_id` reste NULL.
- **Normalisation du matching** : trim + lowercase + Unicode NFD pour gérer les accents (`API Météo` == `api meteo`). Pas de Levenshtein / fuzzy — exact après normalisation.
- **Match ambigu** : si plusieurs projets ont le même nom normalisé dans la promo (rare, invariant théorique de la table `projects` mais pas contraint), on refuse le match, on écrit `manifest_error = "Nom de projet ambigu dans la promo"` et `project_id` reste NULL. Le prof doit renommer l'un des projets.
- **Manifest qui enlève `project:`** : au sync suivant, si le champ disparaît du yaml, le backend remet `project_id` à NULL (y compris si la valeur venait d'un lien UI fallback — le manifest est toujours maître quand il est présent).
- **Pas de nouvelle authent**. Réutilise `requirePromo` / `requirePromoAdmin` / `requireRole`.

### Vue "Cours" dans le projet (DÉCOUVERTE ARCHI)
- **DEUX composants à modifier**, pas un seul :
  - `src/renderer/src/components/projet/StudentProjetFiche.vue` (côté étudiant)
  - `src/renderer/src/components/devoirs/TeacherProjectDetail.vue` (côté prof)
- **Pas de route `/projects/:id`** dans Cursus. Les projets sont browsés via `/devoirs` en mettant `appStore.activeProject = nomProjet` (string, pas id). **La navigation badge → projet doit donc setter `activeProject` et router vers `/devoirs`** — pas créer une nouvelle route.
- **Empty state règle par défaut (déléguée)** :
  - Côté étudiant : si `0 repos liés`, la section Cours est **cachée entièrement** — zéro bruit.
  - Côté prof : la section Cours est **toujours visible**. Si 0 repos, affiche un empty state avec CTA "Lier un cours Lumen" (sinon affiche la liste).
- **Contenu de la section** (les deux vues partagent le même pattern) : pour chaque repo lié, afficher le nom du projet du manifest + la liste des chapitres directement cliquables. Chaque chapitre est un lien deep vers `/lumen?repo=X&chapter=Y`. Pas de progress par chapitre pour v1 (simple).

## Non-objectifs (hors scope)

- **Devoirs ↔ chapitres**. Intégration différente, round suivant si pertinent.
- **Calendrier "lire avant date X"**. Intégration différente.
- **Matching automatique par fuzzy slug**. Rejeté explicitement : fragilité et debugging pénible.
- **Multi-projets par repo** (N:M). Reporté si besoin exprimé.
- **Cross-promo** (un même repo visible dans plusieurs promos). Hors modèle.
- **Widget dashboard "Mon parcours"**. Utile mais différent ; seul le lien direct projet↔cours est dans v2.33.
- **Système de revision / flashcards**. Autre sujet.
- **Enrichir le markdown** (cards custom, Mermaid, tabs). Invalidé explicitement au round 4.

## Critères d'acceptation

Scénario jour-J : Léa, étudiante CESI, ouvre Cursus le premier lundi du pilote. Elle fait partie du projet "API Météo en Python". Son prof a publié le repo `api-meteo-cours` avec `project: "API Météo en Python"` dans `cursus.yaml`.

### Direction projet → cours
- [ ] Dans la vue du projet "API Météo en Python", un onglet ou une section **"Cours"** est visible.
- [ ] L'onglet liste les repos Lumen liés à ce projet (ici : `api-meteo-cours`) avec le nom du manifest (ex: "API Météo — fondamentaux Python").
- [ ] Un clic sur le repo ouvre Lumen sur la première page du cours (`/lumen?repo=X&chapter=...`).
- [ ] L'onglet affiche aussi la liste des chapitres directement cliquables (deep-link par chapitre).

### Direction cours → projet
- [ ] Dans `LumenChapterViewer`, à côté du titre du projet dans le header, un **chip cliquable** "📁 API Météo en Python" apparaît si `lumen_repos.project_id` est renseigné (backend renvoie aussi le `projectName` dans la réponse `serializeRepo`).
- [ ] Cliquer le chip set `appStore.activeProject = projectName` et `router.push({ name: 'devoirs' })`. **Pas de nouvelle route**.
- [ ] Le chip n'est visible que si le student fait partie de la promo du projet (sécurité serveur renvoie déjà les bons repos).

### Déclaration via yaml
- [ ] Le schéma Zod du manifest accepte un champ optionnel `project: string` (max 200 chars).
- [ ] Au sync d'un repo, si `manifest.project` est défini, le backend cherche `projects.name` (case-insensitive, trim) dans la promo et écrit `lumen_repos.project_id`.
- [ ] Si le nom est non trouvé, `manifest_error` contient un message explicite et `project_id` reste NULL.
- [ ] Si le nom est ambigu (plusieurs matches), `manifest_error` le signale et on prend le premier ou on refuse (à trancher en impl).

### Déclaration via UI (fallback)
- [ ] Dans la vue projet (teachers/admin), une action "Lier un repo Lumen" ouvre un picker de repos non liés de la promo.
- [ ] Sélectionner un repo écrit `lumen_repos.project_id` directement (**uniquement si le manifest ne déclare pas déjà un `project:` — dans ce cas, afficher que la déclaration yaml a priorité**).
- [ ] Une action "Délier" remet `project_id` à NULL (uniquement si pas de `project:` dans le manifest).

### Gestion des bords
- [ ] Si le projet est supprimé, `ON DELETE SET NULL` remet `project_id` à NULL — le badge disparaît silencieusement côté chapitre.
- [ ] Si le manifest change et enlève le champ `project:`, le prochain sync remet `project_id` à NULL.
- [ ] Un repo sans `project_id` ne casse rien côté UI (absence de badge, absence dans l'onglet Cours d'aucun projet).

## Hypothèses exposées et résolues

| Hypothèse initiale | Challenge | Résolution |
|---|---|---|
| "Lumen doit devenir plus beau (cards, Mermaid, tabs)" | Contradicteur round 4 : c'est l'anxiété de créateur, pas un besoin étudiant | Invalidée. Direction "enrichir le rendu" abandonnée explicitement. |
| "Les étudiants voudront revenir pour la beauté du rendu" | Round 5 : ils jugent sur la réponse à leur besoin, pas l'esthétique | Invalidée. Critère de retour = intégration au parcours, pas qualité visuelle. |
| "Beaucoup d'intégrations possibles, il faut en choisir plusieurs" | Simplificateur round 6 : une seule intégration peut changer la perception | Confirmée. Focus sur projet↔cours uniquement pour v2.33. |
| "Le matching automatique par slug serait zero-config" | Analyse : fragilité, faux positifs, debugging pénible | Rejetée explicitement. Déclaration explicite (yaml ou UI) obligatoire. |
| "Un lien bidirectionnel c'est trop pour un v1" | Round 7 : le user veut les deux directions pour pouvoir partir d'un endroit OU de l'autre | Confirmée : bidirectionnel est le critère minimal, pas un nice-to-have. |
| "Une seule source de vérité (yaml OU UI, pas les deux)" | Décision d'archi round 8 : yaml-first avec UI fallback | Compromis : yaml gagne, UI fallback pour les cas réels où le yaml n'a pas été touché. |

## Contexte technique (code existant à réutiliser)

### Infrastructure déjà en place (v2.32.1)
- **`lumen_repos.project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL`** — colonne existe depuis la migration v56, ON DELETE SET NULL câblé.
- **`server/db/models/lumen.js`** — fonctions repos déjà présentes, juste à étendre.
- **`server/services/lumenManifest.js`** — schéma Zod à étendre avec un `project: z.string().max(200).optional()` au niveau racine.
- **`server/services/lumenRepoSync.js`** — `syncRepo` est le point où ajouter la résolution projet après parse du manifest.
- **`src/renderer/src/components/lumen/LumenChapterViewer.vue`** — header déjà présent, ajouter un `<span class="lumen-viewer-chip">` avec badge projet et router.push au click.
- **Vue projet Cursus** — à identifier. Probablement `views/ProjectView.vue` ou un onglet dans `MessagesView.vue` selon l'archi. **À explorer avant implémentation.**

### Fichiers à toucher (après exploration du code)
- `server/services/lumenManifest.js` — schema Zod : `project: z.string().max(200).trim().optional()`
- `server/services/lumenRepoSync.js` — après parseManifest dans `syncRepo`, résout le projet via `findProjectByNameNormalized(promoId, manifest.project)` et set `project_id`. Gère ambiguïté + introuvable dans `manifest_error`.
- `server/db/models/lumen.js` — étend `serializeRepo`/helpers pour joindre `projects.name` quand `project_id` est présent. Ajoute `getLumenReposByProjectId(projectId)`.
- `server/db/models/projects.js` — ajoute `findProjectByNameNormalized(promoId, name)` (case-insensitive + trim + NFD). Vérifier si `getProjectsByPromoId` existe déjà.
- `server/routes/lumen.js` :
  - `GET /repos/project/:projectId` — liste les repos d'un projet (chapitres inclus via manifest). Auth `requirePromo` via projectId → promoId lookup.
  - `PUT /repos/:id/project` — body `{ projectId: number | null }`. Teacher/admin only. Refuse si le manifest du repo a un `project:` déclaré (renvoie 409 avec message "déjà lié via cursus.yaml").
- `src/renderer/src/stores/lumen.ts` — ajoute state `reposByProject: Map<projectId, LumenRepo[]>`, actions `fetchReposForProject(projectId)`, `linkRepoToProject(repoId, projectId)`, `unlinkRepoFromProject(repoId)`.
- `src/preload/index.ts` + `web/api-shim.ts` + `renderer/src/env.d.ts` — 3 méthodes : `getLumenReposForProject`, `linkLumenRepoToProject`, `unlinkLumenRepoFromProject`.
- `src/renderer/src/components/lumen/LumenChapterViewer.vue` — ajoute chip projet dans `.lumen-viewer-info`, click → `appStore.activeProject = name` + `router.push({ name: 'devoirs' })`.
- `src/renderer/src/components/projet/StudentProjetFiche.vue` — nouvelle section `<LumenProjectSection :project-id="..." />` cachée si 0 repos.
- `src/renderer/src/components/devoirs/TeacherProjectDetail.vue` — même section avec empty state + bouton "Lier un cours" (modal picker).
- `src/renderer/src/components/lumen/LumenProjectSection.vue` — NOUVEAU composant partagé : fetch repos liés, liste avec chapitres, CTA admin.
- `src/renderer/src/components/lumen/LumenLinkRepoModal.vue` — NOUVEAU : picker modal des repos non liés de la promo (teacher only).
- Tests : `tests/backend/db/lumen.test.js` (étendu), `tests/backend/services/lumenManifest.test.js` (étendu), `tests/backend/routes/lumen.test.js` (nouveau ou ré-intégré).

### Estimation révisée (après exploration)
- Backend résolution + routes + tests : ~2h
- Store + preload + api-shim : ~30 min
- LumenProjectSection.vue (nouveau, réutilisé x2) : ~1h
- LumenLinkRepoModal.vue (nouveau) : ~45 min
- Intégration dans StudentProjetFiche + TeacherProjectDetail : ~30 min
- LumenChapterViewer chip + wiring router : ~20 min
- Tests + ajustements : ~45 min
- **Total révisé : ~6h de travail concentré**

## Transcription

<details><summary>Voir les 8 rounds Q&R</summary>

**Round 1 — Vraie crainte pilote** : Qu'est-ce qui t'empêche de dormir à l'avance pour le jour J ?
→ Réponse : **"Mes cours ne seront pas assez beaux"** → direction "enrichir rendu"

**Round 2 — Référence visuelle** : Quelle est ta référence "cours pro" ?
→ Réponse : **"Docusaurus / GitBook / MkDocs Material"** → pas d'animations, du textuel riche

**Round 3 — Composant prioritaire** : Quel composant manque le plus ?
→ Réponse : **"Callouts/cards custom avec layout riche"** → DSL de blocs composables

**Round 4 — CONTRADICTEUR** : Est-ce ton anxiété d'auteur ou un vrai besoin étudiant ?
→ Réponse : **"Oui c'est mon anxiété, je dois changer d'angle"** → **PIVOT** : direction "beau" invalidée

**Round 5 — Critère de retour étudiant** : Qu'est-ce qui déterminera qu'un étudiant revient dans Lumen ?
→ Réponse : **"Avoir TOUT son parcours au même endroit"** → nouvelle direction : intégration Cursus

**Round 6 — SIMPLIFICATEUR** : Quelle est la SEULE intégration qui change tout ?
→ Réponse : **"Chapitre ↔ canal/projet Cursus"** → valeur maximale + infra déjà présente

**Round 7 — Critère jour-J Léa** : Quel scénario est le minimal non-négociable ?
→ Réponse : **"Les deux directions marchent"** → bidirectionnel est non-négociable

**Round 8 — Mécanisme de déclaration** : Yaml vs UI vs auto vs hybride ?
→ Réponse : **"fais le mieux"** → délégation → choix yaml-first + UI fallback (option D)

</details>
