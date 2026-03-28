---
name: roles-permissions
status: in-progress
created: 2026-03-28T21:25:06Z
progress: 0%
prd: .claude/prds/roles-permissions.md
github: https://github.com/rohanfosse/cursus/issues/54
---

# Epic: roles-permissions

## Overview

Refonte du systeme de permissions de Cursus : passer d'un modele binaire hardcode (teacher/student avec TA en greffe) a une hierarchie heritee a 4 niveaux (admin > teacher > ta > student) avec une entite Projet comme unite organisationnelle fondamentale. Le TA devient un enseignant scope a ses projets assignes, l'enseignant devient admin de sa promo, et un admin global gere l'infrastructure.

**Impact mesure** : 129 occurrences de `requireTeacher`/`handleTeacher` dans 20 fichiers backend/IPC, 32 checks role-based dans 12 fichiers frontend.

## Architecture Decisions

### AD-1 : Hierarchie heritee plutot que RBAC

On utilise un modele simple d'heritage lineaire (`admin > teacher > ta > student`) au lieu d'un RBAC avec matrice de permissions. Chaque role herite de tous les droits du role inferieur. Choisi pour sa simplicite et parce que le besoin Q1 2027 (ajout d'un `super-admin`) ne necessite qu'une extension de la chaine.

### AD-2 : Fichier permissions centralise

Un seul fichier `shared/permissions.js` (utilise cote serveur ET cote renderer via copie) definit la hierarchie, les fonctions de verification, et la matrice admin. Elimine les 32+129 checks disperses au profit d'imports d'un module unique.

### AD-3 : Entite Projet comme unite structurante

Le Projet n'est pas un simple conteneur — c'est l'unite fondamentale d'organisation. Tout devoir appartient a un projet. Les TAs sont scopes par projet (pas par canal). Ca implique une migration des devoirs existants dans des projets par defaut et le remplacement de `teacher_channels` par `teacher_projects`.

### AD-4 : Defaut restrictif pour les TAs

Inversion du comportement actuel : un TA sans assignation a **zero acces** (au lieu de l'acces total actuel). Le code dans `authorize.js:90-104` qui donne un fallback permissif est supprime.

### AD-5 : Admin scope pour les enseignants

Le panel admin est divise en deux tiers :
- **Modules systeme** (admin global uniquement) : securite, maintenance, deploy, sessions, settings, audit
- **Modules promo** (enseignant de la promo) : stats, feedback, moderation, users

## Technical Approach

### Backend Services

**Couche DB (`server/db/schema.js`)** :
- Migration : ajouter `'admin'` au CHECK constraint de `teachers.role`
- Nouvelles tables : `projects`, `project_travaux`, `project_documents`, `teacher_projects`, `teacher_promos`
- Migration des donnees : creer un projet par defaut pour chaque devoir existant, convertir `teacher_channels` → `teacher_projects`
- Drop `teacher_channels` apres migration

**Module permissions (`shared/permissions.js`)** :
```js
const ROLE_LEVELS = { student: 0, ta: 1, teacher: 2, admin: 3 }

function hasRole(userRole, requiredRole) {
  return (ROLE_LEVELS[userRole] ?? -1) >= (ROLE_LEVELS[requiredRole] ?? Infinity)
}

function canAccessProject(db, userId, projectId) { /* ... */ }
function canAccessPromo(db, userId, promoId) { /* ... */ }
function isSystemAdmin(userRole) { return userRole === 'admin' }

const ADMIN_MODULES = {
  stats: 'teacher', feedback: 'teacher', moderation: 'teacher', users: 'teacher',
  security: 'admin', maintenance: 'admin', deploy: 'admin',
  sessions: 'admin', settings: 'admin', audit: 'admin',
}
```

**Middleware (`server/middleware/authorize.js`)** :
- `requireRole(minRole)` remplace `requireTeacher` — compare via `hasRole()`
- `requireProject(getProjectId)` — scope les TAs a leurs projets assignes
- `requirePromoAdmin(getPromoId)` — verifie que l'enseignant est responsable de la promo
- Suppression du fallback permissif pour les TAs

**IPC (`src/main/ipc/helpers.js`)** :
- `handleRole(minRole, channel, fn)` remplace `handleTeacher`
- `handleProject(channel, getProjectId, fn)` pour les operations TA

**Modele projects (`server/db/models/projects.js`)** :
- CRUD projets (create, list, update, delete)
- Assignation TA a un projet avec notification
- Liaison devoirs/documents au projet

**Routes admin (`server/routes/admin/`)** :
- `requireAdmin` dans `index.js` : verifier `'admin'` pour les modules systeme
- Nouveau middleware `requirePromoAdmin` pour les modules promo (stats, feedback, moderation, users)
- Filtrage des donnees par promo pour les enseignants

### Frontend Components

**Store (`src/renderer/src/stores/app.ts`)** :
- Ajouter `isAdmin = computed(() => currentUser.value?.type === 'admin')`
- Modifier `isStaff` pour inclure admin : `type === 'admin' || type === 'teacher' || type === 'ta'`
- Exposer `userRole` computed pour usage dans permissions

**Module permissions (`src/renderer/src/utils/permissions.ts`)** :
- Miroir du backend : `hasRole()`, `canAccessModule()`
- Composable `usePermissions()` exportant des computed reactifs
- Remplace les 32 occurrences de `v-if="appStore.isTeacher"` etc.

**Router (`src/renderer/src/router/index.ts`)** :
- `meta.requiredRole` au lieu de `meta.requiresTeacher`
- Guard generique basee sur `hasRole()`

**Vues impactees** (12 fichiers, 32 occurrences) :
- `NavRail.vue` (5), `Sidebar.vue` (5), `SidebarDashboard.vue` (4), `DocumentsView.vue` (7)
- `MessageBubble.vue` (2), `ChannelMembersPanel.vue` (2), `RessourcesModal.vue` (2)
- `MessagesView.vue` (1), `DashboardView.vue` (1), `DevoirsHeader.vue` (1)
- `ChannelDocsPanel.vue` (1), `SettingsPreferences.vue` (1)

**Panel admin frontend** :
- Conditionner l'affichage des modules selon `ADMIN_MODULES[module]` et le role

**Projet UI** :
- Vue de gestion des projets pour les enseignants (CRUD + assignation TA)
- Sidebar TA filtree par projets assignes

### Infrastructure

Aucun changement infra — tout reste en SQLite local + Electron. La migration DB est geree par le systeme de versions existant dans `schema.js`.

## Implementation Strategy

Approche en **3 phases sequentielles**, chaque phase livrable independamment :

**Phase 1 — Fondations (taches 1-3)** : Schema DB + module permissions + migration middleware backend. Apres cette phase, le backend fonctionne avec la nouvelle hierarchie.

**Phase 2 — Donnees (taches 4-5)** : Entite Projet CRUD + migration des donnees existantes. Apres cette phase, tous les devoirs sont dans des projets.

**Phase 3 — Frontend + Polish (taches 6-9)** : Permissions frontend + panel admin scope + UI projets + migration des vues. Apres cette phase, l'app est complete.

**Parallelisation** : Les taches 2 et 3 peuvent etre executees en parallele (permissions module + middleware refactor). Les taches 6, 7 et 8 aussi (frontend permissions + admin panel + projet UI).

## Task Breakdown Preview

| # | Tache | Depend de | Parallele | Effort |
|---|-------|-----------|-----------|--------|
| 1 | Schema DB : tables + migration role admin | — | Non | M |
| 2 | Module permissions centralise (shared) | 1 | Oui (avec 3) | S |
| 3 | Refactor middleware + IPC (129 occurrences) | 1 | Oui (avec 2) | L |
| 4 | Modele Projet : CRUD + assignation TA | 1 | Non | M |
| 5 | Migration donnees : devoirs → projets, teacher_channels → teacher_projects | 1, 4 | Non | M |
| 6 | Frontend permissions (store + composable + 32 occurrences) | 2 | Oui (avec 7, 8) | M |
| 7 | Panel admin scope (modules systeme vs promo) | 2, 3 | Oui (avec 6, 8) | M |
| 8 | UI Projet (CRUD enseignant + sidebar TA) | 4 | Oui (avec 6, 7) | L |
| 9 | Tests + regression etudiante | 1-8 | Non | M |

**9 taches** — S = 2-4h, M = 4-8h, L = 8-16h. Effort total estime : ~60-80h (4-6 semaines a 15h/semaine).

## Dependencies

- **Schema DB existant** : `server/db/schema.js` (systeme de migration par version)
- **Middleware existant** : `server/middleware/authorize.js` (7 fonctions a refactorer)
- **IPC helpers** : `src/main/ipc/helpers.js` (3 wrappers a etendre)
- **Store app** : `src/renderer/src/stores/app.ts` (3 computed roles)
- **Systeme de notifications** : deja en place pour le flux d'assignation TA
- **Routes admin** : 13 modules dans `server/routes/admin/`
- **20 fichiers de routes** avec `requireTeacher` (129 occurrences)
- **12 fichiers frontend** avec checks role-based (32 occurrences)

## Success Criteria (Technical)

- `hasRole('ta', 'teacher')` retourne `false` (TA < teacher)
- `hasRole('admin', 'teacher')` retourne `true` (admin > teacher)
- Un TA sans `teacher_projects` ne voit aucun canal, aucun devoir, aucun DM
- Aucun devoir orphelin (tout devoir a un `project_id` via `project_travaux`)
- `requireTeacher` et `handleTeacher` n'existent plus dans le code
- Les 12 fichiers frontend utilisent `usePermissions()` au lieu de `appStore.isTeacher`
- Le panel admin filtre les modules selon le role sans erreur
- Les tests existants passent (zero regression etudiant)

## Estimated Effort

- **Total** : 60-80 heures
- **Timeline** : 4-6 semaines a 15h/semaine
- **Risque principal** : la migration des 129 occurrences backend (tache 3) est la plus volumineuse et la plus risquee en termes de regression
- **Mitigation** : executer la tache 3 avec des tests de regression (tache 9) en boucle courte

## Tasks Created
- [ ] 001.md - Schema DB : tables Projet + migration role admin (parallel: false)
- [ ] 002.md - Module permissions centralise (parallel: true, avec 003)
- [ ] 003.md - Refactor middleware + IPC 129 occurrences (parallel: true, avec 002)
- [ ] 004.md - Modele Projet : CRUD + assignation TA (parallel: true)
- [ ] 005.md - Migration donnees devoirs + teacher_channels (parallel: false)
- [ ] 006.md - Frontend permissions store + composable + 32 occ. (parallel: true, avec 007/008)
- [ ] 007.md - Panel admin scope systeme vs promo (parallel: true, avec 006/008)
- [ ] 008.md - UI Projet CRUD enseignant + sidebar TA (parallel: true, avec 006/007)
- [ ] 009.md - Tests de regression + validation etudiant (parallel: false)

Total tasks: 9
Parallel tasks: 6 (002+003, 004, 006+007+008)
Sequential tasks: 3 (001, 005, 009)
Estimated total effort: 75 hours
