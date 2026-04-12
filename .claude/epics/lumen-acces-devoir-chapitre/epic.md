---
name: lumen-acces-devoir-chapitre
status: completed
created: 2026-04-11T16:14:58Z
updated: 2026-04-12T09:15:00Z
progress: 100%
prd: .claude/prds/lumen-acces-devoir-chapitre.md
github: (will be set on sync)
---

# Epic: lumen-acces-devoir-chapitre

## Overview

Audit brownfield (cf. spec deep-interview du 2026-04-11) montre que **l'infra v2.42 est en place** et fonctionnelle :
- Schema SQLite : table N:M `lumen_chapter_travaux(travail_id, repo_id, chapter_path)` (composite PK).
- API/IPC : `getLumenChaptersForTravail`, `linkLumenChapterToTravail`, `unlinkLumenChapterFromTravail`, `getLumenTravauxForChapter`.
- UI etudiant : `LumenDevoirChapterHints.vue` deja live dans `StudentDevoirCard.vue` (clic → router vers Lumen avec `?repo=X&chapter=Y`).
- Modal cote-chapitre : `LumenLinkDevoirModal.vue` permet au prof depuis Lumen de lier des devoirs a UN chapitre.

**Le delta a livrer est plus etroit que prevu :**

1. **UI prof cote-devoir manquante.** Le prof qui ouvre `GestionDevoirModal` n'a aucune visibilite ni contrôle sur les chapitres lies. Il doit aller cote Lumen et faire la liaison "en sens inverse". C'est contre-intuitif quand on cree/maintient un devoir.
2. **Pas de support d'ancres.** La route `lumen?repo=X&chapter=Y` ouvre le bon chapitre mais ne sait pas scroller a une section interne. Pour les longs chapitres, "1 clic vers le chapitre" reste un atterrissage en haut, pas a la section pertinente.
3. **Tests vue absents** sur `LumenDevoirChapterHints` et le nouveau code.

## Architecture Decisions

- **Pas de migration de schema.** Le PK composite suffit pour modeliser N:M ; ajouter une colonne `anchor` impliquerait une migration v60 et casserait la PK. Les ancres restent transportees uniquement par l'URL Lumen, pas persistees en base. Tradeoff accepte : un lien stocke = "ouvre ce chapitre", pas "ouvre cette section". Si plus tard une demande pilote forte exige des deep-links ancres, on ajoutera une colonne `chapter_anchor` (nullable, sans casser la PK existante).
- **Nouveau composant `DevoirChapterLinksSection.vue`** plutot qu'integration inline dans `DevoirMetaSection`. Cohesion ↑, taille du fichier ↓ (la regle commune est <800 lignes/fichier).
- **Nouveau composant `LumenChapterPickerModal.vue`** plutot que reutiliser `LumenLinkDevoirModal` : la directionnalite est inverse (1 devoir → N chapitres vs 1 chapitre → N devoirs), la source de donnees aussi (chapitres = `lumenStore.repos[].manifest.chapters` vs devoirs = `getGanttData`). Reuser forcerait un composant hybride moins lisible.
- **Anchor support : prop sur le viewer**, pas event ni store. `LumenChapterViewer` recoit `initialAnchor?: string` ; apres `enrichRender()`, si l'ancre matche un id du DOM, on `scrollIntoView` a la place du `scrollTo({top:0})` initial. Une seule fois par changement de chapitre.

## Technical Approach

### Frontend Components

**Nouveau** :
- `src/renderer/src/components/devoirs/sections/DevoirChapterLinksSection.vue`
  - Props : `travailId: number`
  - Etat : liste des chapitres lies (fetch via `getLumenChaptersForTravail`)
  - UI : titre "Chapitres lies" + liste ; bouton "Lier un chapitre" ouvre le picker
  - Actions : retirer un lien (`unlinkLumenChapterFromTravail`), ajouter via picker (`linkLumenChapterToTravail`)
  - Visible uniquement pour les profs (`appStore.currentUser.type`)
- `src/renderer/src/components/lumen/LumenChapterPickerModal.vue`
  - Props : `travailId`, `alreadyLinked: Set<string>` (cles `repoId::path`)
  - Source : `lumenStore.repos` (deja en memoire pour la promo active)
  - UI : recherche + arborescence repo → chapitre, click toggle
  - Emits : `close`, `linked(repoId, path)`

**Modifies** :
- `src/renderer/src/components/modals/GestionDevoirModal.vue`
  - Inserer `<DevoirChapterLinksSection :travailId="travail.id" />` apres `DevoirRendusList`, avant `DevoirConsignesSection`.
- `src/renderer/src/components/lumen/LumenChapterViewer.vue`
  - Ajouter `initialAnchor?: string` aux props.
  - Dans `enrichRender()`, apres `extractHeadings`, si `props.initialAnchor` correspond a un heading id : `scrollToHeading(props.initialAnchor)` au lieu du `scrollTo({top:0})`.
  - Reset entre chapitres : la prop est passee une seule fois par mount/changement de chapitre, le reset naturel via `watch` suffit.
- `src/renderer/src/views/LumenView.vue`
  - `applyUrlSelection()` : parser aussi `route.query.anchor` (string).
  - Stocker dans une ref `pendingAnchor: string | null`, passer en prop a `LumenChapterViewer`.
  - Effacer `pendingAnchor` apres premier scroll consume (eviter re-scroll au resync).

### Backend Services

Aucune modification backend. Toute l'API et le schema existent deja.

### Infrastructure

Aucune modification d'infra/build/CI.

## Implementation Strategy

Sequentiel (les 3 morceaux ne sont pas paralleles entre eux car les tests dependent des composants) :

1. **T1 — Ancre support** (le plus petit, le plus isole, le moins risque) :
   - Modifier `LumenChapterViewer.vue` (prop + scroll conditional)
   - Modifier `LumenView.vue` (parse anchor query)
2. **T2 — UI prof cote devoir** :
   - Creer `LumenChapterPickerModal.vue`
   - Creer `DevoirChapterLinksSection.vue`
   - Integrer dans `GestionDevoirModal.vue`
3. **T3 — Tests** :
   - Tests `LumenDevoirChapterHints.vue` (lock du comportement existant)
   - Tests `DevoirChapterLinksSection.vue` (rendering + add/remove + visibility)
   - Test `applyUrlSelection` cote LumenView pour la query `anchor` (peut etre couvert par un test ciblé)

Build + simplify + commit a la fin.

## Task Breakdown Preview

| # | Tache | Effort | Files |
|---|-------|--------|-------|
| T1 | Anchor support `?anchor=` | S | LumenView.vue, LumenChapterViewer.vue |
| T2 | UI prof cote devoir | M | DevoirChapterLinksSection.vue (new), LumenChapterPickerModal.vue (new), GestionDevoirModal.vue (edit) |
| T3 | Tests vitest | S | tests/renderer/components/lumen/* (new), tests/renderer/components/devoirs/* (new) |

## Dependencies

- API IPC `window.api.getLumenChaptersForTravail / linkLumenChapterToTravail / unlinkLumenChapterFromTravail` (deja implementes).
- `lumenStore.repos` deja peuple cote teacher (le `GestionDevoirModal` est cote teacher uniquement).
- Composant `LumenDevoirChapterHints.vue` deja en prod cote etudiant (pas a toucher fonctionnellement, juste le couvrir de tests).

## Success Criteria (Technical)

- Zero migration DB.
- Zero modification backend.
- Tous les nouveaux composants < 250 lignes (regle 200-400 typique).
- Vitest passe pour les nouveaux tests + pas de regression sur la suite existante.
- Build renderer reussit sans warning nouveau.
- Smoke manuel impossible dans cette session (electron natif), valide via tests + revue de code.

## Estimated Effort

~1h chrono : T1 ~15min, T2 ~30min, T3 ~10min, build/simplify/commit ~5min.
