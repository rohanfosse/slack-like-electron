<!-- Generated 2026-04-11 | Cursus v2.42.0 | Lumen sub-app architecture reference -->

# Lumen — architecture de reference

> Ce document capture l'etat de la sous-app Lumen (cours pedagogiques) apres la serie de pivots du 2026-04-11. Destine aux futures sessions de dev (humaines ou AI) pour eviter de re-explorer le code.

## Mental model

```
Promo (Cursus)
  └─ 1 Organisation GitHub  (promotions.github_org)
       └─ N Repositories
            ├─ cursus.yaml  (manifest obligatoire a la racine)
            │   ├─ project: "Titre d'affichage du cours"         (required, string)
            │   ├─ cursusProject: "Nom d'un projet Cursus"       (optional, lien repo<->projet)
            │   ├─ chapters: [{title, path, duration?, summary?, prerequis?}]
            │   └─ resources: [{path, kind, title}]              (optional)
            └─ N fichiers .md referencs par chapters[].path
```

**Lumen n'est pas un CMS** : le prof edite ses cours en dehors de l'app (VS Code, github.com, Copilot) puis sync. Lumen est une **liseuse avec integration profonde dans le parcours Cursus** — c'est le vrai levier de valeur, pas la qualite visuelle du rendu.

## Schema DB (migrations v56 + v57)

### Tables Lumen

| Table | Cle | Role |
|---|---|---|
| `lumen_github_auth` | (user_type, user_id) | Token PAT par user, **chiffre AES-GCM** (format `enc:...`). Legacy plain migres lazily au premier read. |
| `lumen_repos` | id, UNIQUE(promo_id, owner, repo) | Un repo par promo. Contient `manifest_json` parse + `manifest_error` + `project_id` (lien Cursus, FK ON DELETE SET NULL) + `last_commit_sha` + `last_synced_at`. |
| `lumen_file_cache` | (repo_id, path) | Cache markdown avec images inlinees (data URI). Pruned au sync + TTL 30j. |
| `lumen_chapter_notes` | (student_id, repo_id, path) | Notes privees etudiant, max 10k chars. |
| `lumen_chapter_reads` | (student_id, repo_id, path) | Tracking de lecture (upsert idempotent). |
| `lumen_chapter_travaux` | (travail_id, repo_id, chapter_path) | Liaison N:M devoir <-> chapitre. Cascading deletes. |

### Promo ↔ Organisation GitHub

Colonne `promotions.github_org TEXT` (ajoutee en v56). Un prof admin de la promo la configure via le modal settings dans `LumenView`. Le sync liste tous les repos de l'org via octokit.

### Repo ↔ Projet Cursus

Colonne `lumen_repos.project_id INTEGER REFERENCES projects(id)`. Deux voies d'ecriture :
1. **Yaml maitre** : `cursusProject: "API Meteo"` dans cursus.yaml. Resolu au sync par `findProjectByNormalizedName(promoId, name)` (normalisation trim + lowercase + Unicode NFD).
2. **UI fallback** : teacher admin assigne manuellement via `LumenLinkRepoModal`. **Refuse (409) si le manifest declare deja un cursusProject** (yaml prioritaire).

Ambiguite (plusieurs projets meme nom normalise) : refus explicite avec `manifest_error`. `projects.name` n'est pas UNIQUE dans le schema — on gere cote application, pas cote DB.

## Architecture backend

```
server/
├── db/
│   ├── schema.js              migrations v56 (pivot) + v57 (chapter_travaux)
│   └── models/
│       ├── lumen.js           SEULE source DB Lumen (tous les helpers)
│       └── projects.js        normalizeProjectName + findProjectByNormalizedName
├── services/
│   ├── githubClient.js        Factory Octokit — dynamic import (ESM v22+),
│   │                          mapOctokitError avec rate limit actionnable
│   ├── lumenManifest.js       Zod schema + parseManifest
│   └── lumenRepoSync.js       syncPromoRepos (parallele batch 5),
│                              fetchChapterContent + inlineImages (data URIs),
│                              pruneLumenFileCache apres sync
├── routes/
│   └── lumen.js               Tous les endpoints (~20 routes)
└── utils/
    └── crypto.js              encrypt/decrypt AES-GCM (reutilise pour tokens)
```

### Routes principales

| Methode + Path | Role | Auth |
|---|---|---|
| `GET /api/lumen/github/me` | Statut connexion GitHub | auth |
| `POST /api/lumen/github/connect` | Valide + stocke PAT (chiffre) | auth |
| `DELETE /api/lumen/github/disconnect` | | auth |
| `GET/PUT /api/lumen/promos/:id/github-org` | Mapping promo↔org | requirePromo/Admin |
| `GET /api/lumen/repos/promo/:promoId` | Liste repos de la promo | requirePromo |
| `POST /api/lumen/repos/sync/promo/:promoId` | Sync depuis GitHub | requirePromo |
| `GET /api/lumen/repos/:id` | Detail repo | requirePromo |
| `GET /api/lumen/repos/:id/content?path=X` | Contenu chapitre (avec cache) | requirePromo |
| `GET /api/lumen/repos/by-project-name?promoId&name` | Repos lies a un projet (par nom) | requirePromo |
| `GET /api/lumen/repos/promo/:promoId/unlinked` | Picker UI teacher | requirePromoAdmin |
| `PUT /api/lumen/repos/:id/project` | UI fallback lien projet | requirePromoAdmin, refuse si yaml declare |
| `GET/PUT/DELETE /api/lumen/repos/:id/note` | Notes privees | student |
| `POST /api/lumen/repos/:id/read` | Mark as read | student |
| `GET /api/lumen/repos/:id/chapters/travaux?path` | Devoirs lies a un chapitre | requirePromo |
| `GET /api/lumen/travaux/:id/chapters` | Chapitres lies a un devoir | requirePromo |
| `POST/DELETE /api/lumen/chapters/travaux` | Lier/delier chapitre↔devoir | teacher/admin |
| `GET /api/lumen/my-notes` | Export notes | student |

## Architecture frontend

```
src/renderer/src/
├── views/
│   └── LumenView.vue                      Orchestrateur 3 colonnes + topbar + modal settings
├── components/
│   ├── lumen/
│   │   ├── LumenRepoSidebar.vue           Sidebar repos + chapitres, filter, per-repo progress
│   │   ├── LumenChapterViewer.vue         Reader markdown + chip projet + footer devoirs + nav prev/next
│   │   ├── LumenNotePanel.vue             Notes privees (cle repoId+path, debounce 1.5s)
│   │   ├── LumenGithubConnect.vue         Ecran PAT au premier lancement
│   │   ├── LumenProjectSection.vue        PARTAGE Student/Teacher : section "Cours Lumen" dans la vue projet
│   │   ├── LumenLinkRepoModal.vue         Teacher : picker repos non-lies a lier a un projet
│   │   ├── LumenLinkDevoirModal.vue       Teacher : toggle chapitre <-> devoirs dans le viewer
│   │   └── LumenDevoirChapterHints.vue    Student : hints "Chapitres a revoir" dans StudentDevoirCard
│   ├── projet/
│   │   └── StudentProjetFiche.vue         Integre LumenProjectSection (is-teacher=false)
│   └── devoirs/
│       ├── TeacherProjectDetail.vue       Integre LumenProjectSection (is-teacher=true)
│       └── StudentDevoirCard.vue          Integre LumenDevoirChapterHints
├── stores/
│   └── lumen.ts                           State (repos, currentRepo, chapterContents Map, chapterNotes Map, readChapters Set, githubStatus, promoOrg)
├── utils/
│   └── markdown.ts                        renderMarkdown avec options.chapterPath pour rewriter liens
├── types/index.ts                         LumenRepo, LumenManifest, LumenChapter, LumenChapterContent, LumenChapterNote, LumenLinkedTravail, LumenLinkedChapter
└── preload/index.ts + web/api-shim.ts + env.d.ts
                                           window.api.getLumen* / syncLumen* / linkLumen* / unlinkLumen*
```

### Design system

- **Editorial content-first** : Newsreader serif pour le markdown body, sans-serif pour le chrome
- **Type scale fort** h1 2.2em → h6 0.9em avec letter-spacing tight
- **Accent color** sur les liens, chips, CTAs
- **Admonitions Obsidian** `[!NOTE]` `[!WARNING]` etc. avec icones SVG lucide
- **Copy button** injecte dynamiquement sur `pre.lumen-code` via DOM manipulation post-render
- **Hint blocks** (accent-softened : `color-mix(in srgb, var(--accent) 6%, var(--bg-secondary))`) pour les sections "Devoirs lies" et "Chapitres a revoir"

## Decisions importantes a connaitre

1. **Octokit v22 est ESM-only** — `server/services/githubClient.js` utilise `dynamic import()` cache. Ne pas tenter un `require('@octokit/rest')`.

2. **Projets Cursus par nom, pas par ID** cote frontend — legacy `travaux.category = projects.name` utilise partout. Les endpoints `by-project-name` acceptent le nom normalise. La navigation projet = `appStore.activeProject = name; router.push('/devoirs')`. **Pas de route /projects/:id.**

3. **Manifest toujours maitre** sur `cursusProject` :
   - Champ present → ecrit `project_id` au sync (NULL si ne resout pas).
   - Champ absent → preserve la valeur existante (compatible avec UI fallback pose manuellement).
   - L'UI fallback refuse 409 si le manifest declare deja le champ.

4. **`project` (manifest) vs `cursusProject` (manifest)** sont DEUX champs distincts :
   - `project` = titre d'affichage du cours (required, historique)
   - `cursusProject` = nom du projet Cursus auquel lier (optional, ajoute en v2.41.0)

5. **Images dans les cours privees** : le backend fetch via octokit et inline en data URIs dans le markdown mis en cache. `<img>` cote renderer n'a pas besoin d'auth. Limites : 1.5 MB/image, 6 MB/chapitre, placeholder si depasse.

6. **Tokens GitHub chiffres** avec les helpers `server/utils/crypto.js` (AES-256-GCM derive JWT_SECRET via pbkdf2). Format DB : `enc:<base64>`. Migration lazy des legacy plain. Tests dependent de `process.env.JWT_SECRET` — se setter en tete de fichier.

7. **Le sync est idempotent + parallelise** par batch de 5 repos. `syncRepo` appelle `pruneLumenFileCacheForRepo` apres un parse reussi pour virer les chapitres retires du manifest.

## Flow utilisateur complet (reference)

### Premier sync d'une promo
1. Prof admin configure `github_org` via le modal settings de LumenView
2. Prof clique "Synchroniser"
3. `syncPromoRepos` liste tous les repos non-archives de l'org via octokit
4. Pour chaque repo, parallele par batch de 5 : upsert dans `lumen_repos`, fetch `cursus.yaml`, parse Zod, resoud `cursusProject` si present, stocke `manifest_json` + `project_id` + `manifest_error` si pertinent
5. Les repos qui ne sont plus dans l'org sont pruned

### Etudiant ouvre Lumen
1. Pas de token → LumenGithubConnect (PAT paste)
2. Token ok → fetch repos de la promo + fetch reads → sidebar remplie
3. Si stale > 15 min, auto-sync declenche
4. Deep link URL applique si presente (?repo=X&chapter=Y)

### Etudiant ouvre un projet dans /devoirs
1. `appStore.activeProject = nom` + navigation
2. StudentProjetFiche.vue se monte avec `projectKey: nom + promoId`
3. `<LumenProjectSection>` fetch repos lies via `/repos/by-project-name`
4. Cache entierement si 0 repos (student), liste repos + chapitres si > 0

### Etudiant ouvre un devoir
1. `StudentDevoirCard` se monte avec `devoir`
2. `<LumenDevoirChapterHints travail-id>` fetch chapitres via `/travaux/:id/chapters`
3. Affichage conditionnel : cache si 0 chapitres, hint compact accent-softened sinon
4. Click chapitre → deep-link `/lumen?repo=X&chapter=Y`

### Prof lit un chapitre dans Lumen et veut le lier a un DS
1. Ouvre le chapitre dans LumenChapterViewer
2. Footer "Devoirs lies" affiche bouton "+ Lier un devoir" (teacher only)
3. LumenLinkDevoirModal liste les travaux de la promo via `getGanttData`
4. Toggle click-to-link, feedback immediat
5. Au retour dans le viewer, la liste des devoirs lies est refresh

## Tests

| Fichier | Tests | Couvre |
|---|---|---|
| `tests/backend/db/lumen.test.js` | 29 | github auth + chiffrement + promo org + repos + file cache + notes + reads + stats |
| `tests/backend/db/lumen-projects.test.js` | 19 | normalizeProjectName + findProjectByNormalizedName + resolution manifest + UI fallback + listing |
| `tests/backend/db/lumen-chapter-travaux.test.js` | 11 | link/unlink + getTravaux/Chapters + counts + cascading deletes |
| `tests/backend/services/lumenManifest.test.js` | 14 | parsing Zod + rejets + cursusProject optionnel |

Total Lumen : **73 tests**. Tous les tests qui touchent Lumen doivent avoir `process.env.JWT_SECRET = '...'` en tete de fichier a cause du chiffrement.

## Non-scope explicite (a NE PAS implementer sans nouvelle deep interview)

- Enrichissement du rendu markdown (Mermaid, tabs, cards custom, DSL de composants)
- PR workflow etudiant dans Lumen
- Historique git visible dans l'UI
- Co-edition temps reel
- Formats non-markdown (PDF, docx, notebooks)
- Matching automatique projet par slug fuzzy
- OAuth device flow (PAT uniquement pour l'instant)
- Migration UNIQUE(promo_id, name) sur projects (risque donnees)

## Pour en savoir plus

- Spec deep interview pivot : [.claude/specs/deep-interview-lumen-pivot-github.md](../.claude/specs/deep-interview-lumen-pivot-github.md)
- Spec integration projet : [.claude/specs/deep-interview-lumen-projet-integration.md](../.claude/specs/deep-interview-lumen-projet-integration.md)
