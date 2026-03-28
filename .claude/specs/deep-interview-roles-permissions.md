---
subject: Roles et permissions — refonte hierarchique
type: brownfield
rounds: 12
ambiguity: 9%
created: 2026-03-28
---

# Specification : Roles et permissions — refonte hierarchique

## Scores de clarte

| Dimension | Score | Poids | Contribution |
|-----------|-------|-------|-------------|
| Objectif | 0.95 | 35% | 0.333 |
| Contraintes | 0.85 | 25% | 0.213 |
| Criteres de succes | 0.9 | 25% | 0.225 |
| Contexte brownfield | 0.9 | 15% | 0.135 |

## Objectif

Remplacer le systeme de permissions binaire actuel (hardcode dans ~20 fichiers) par une **hierarchie heritee a 4 niveaux** avec une nouvelle entite "Projet" comme unite organisationnelle fondamentale.

### Hierarchie cible

```
Admin global (Rohan — administre toute l'app)
  └─ Enseignant / Responsable Pedagogique
       ├─ responsable de 1+ promotions
       ├─ admin de sa promo (stats, feedback, moderation de ses canaux)
       ├─ cree les projets, devoirs, quiz, documents
       └─ assigne des projets aux TAs
            └─ Intervenant / TA
                 ├─ = enseignant MOINS les droits admin
                 ├─ scope = projets assignes (notification + acces auto)
                 ├─ voit documents, chat, devoirs du projet
                 ├─ corrige les devoirs qu'on lui assigne
                 └─ ne cree pas de contenu pedagogique
                      └─ Etudiant
                           └─ appartient a 1 promotion unique
```

### Definition cle : le TA

Un TA est un **enseignant avec moins de droits admin**, scope a ses projets. Il fait tout ce que le teacher fait (chat, devoirs, documents, quiz, notation) sauf :
- Pas d'acces admin (stats globales, moderation, config, sessions, audit)
- Perimetre restreint a ses projets assignes
- Ne peut pas creer de nouveaux projets/devoirs (seulement corriger ceux qu'on lui assigne)

### Separation admin global vs enseignant

| Module admin | Admin global | Enseignant (sa promo) | TA |
|-------------|-------------|----------------------|-----|
| Stats | Toutes promos | Ses promos | Non |
| Feedback | Tous | Sa promo | Non |
| Moderation | Global | Ses canaux | Non |
| Users | Tous | Ses etudiants | Non |
| Securite | Oui | Non | Non |
| Maintenance | Oui | Non | Non |
| Deploy | Oui | Non | Non |
| Sessions | Oui | Non | Non |
| Settings | Oui | Non | Non |
| Audit | Oui | Non | Non |

### Nouvelle entite : Projet

Un **Projet** est l'unite organisationnelle fondamentale. **Tout devoir, document et canal appartient a un projet.** Pas d'exception.

Un Projet regroupe :
- Un ou plusieurs devoirs (travaux)
- Des documents/ressources associes
- Un canal de communication dedie
- Une deadline

Position dans la hierarchie : au-dessus du canal, en-dessous de la promo.
Les TAs sont assignes a des **projets**, pas a des canaux.

Les devoirs existants seront migres dans des projets par defaut lors de la migration.

### Flux d'assignation TA

1. L'enseignant cree un projet dans une promo
2. L'enseignant assigne le projet a un TA
3. Le TA recoit une **notification** automatique
4. Le projet apparait dans la sidebar du TA avec **acces immediat**
5. Le TA peut voir le chat, les documents, les copies a corriger
6. Zero friction, zero acceptation requise

## Contraintes

- **Timeline : tout avant septembre 2026** — les 4 niveaux hierarchiques + entite Projet doivent etre implementes pour le pilote
- **0-2 TAs au pilote** mais le systeme doit etre propre des le jour 1 (pas de backward-compat hack)
- **10-20h/semaine** de dev, un seul developpeur
- **Defaut TA restrictif** : un TA sans assignation = zero acces (inverser le comportement actuel)
- **Migration obligatoire** : tous les devoirs existants migrent dans des projets par defaut. `teacher_channels` migre vers `teacher_projects`
- **Projet = obligatoire** : tout devoir doit appartenir a un projet, pas de devoirs libres

## Non-objectifs (hors scope)

- Sous-roles etudiants (delegue, tuteur, chef de projet) — pas un besoin pour le pilote
- Permissions granulaires lecture/ecriture par action — la hierarchie suffit
- RBAC dynamique avec permissions custom par utilisateur
- Multi-etablissement (super-admin par ecole) — Q1 2027
- Invitation avec acceptation (le TA n'a pas a accepter un projet)

## Criteres d'acceptation

- [ ] **4 roles fonctionnels** : admin global, enseignant, TA, etudiant
- [ ] **Entite Projet en DB** : table `projects` reliant devoirs + documents + canal + deadline
- [ ] **Tout devoir dans un projet** : pas de devoirs libres, migration des existants
- [ ] **Assignation TA par projet** : table `teacher_projects` remplacant `teacher_channels`
- [ ] **Notification auto** : le TA recoit une notif et un acces immediat quand assigne a un projet
- [ ] **Defaut TA restrictif** : TA sans projet assigne = zero acces (plus de fallback permissif)
- [ ] **Admin global** : seul role avec acces au panel admin complet (securite, maintenance, deploy, sessions, settings, audit)
- [ ] **Enseignant = admin de sa promo** : stats, feedback, moderation, users de sa promo
- [ ] **TA** : voit et agit uniquement sur ses projets assignes (chat, documents, notation)
- [ ] **Etudiant** : inchange (1 promo, ses devoirs, ses messages)
- [ ] **Permissions centralisees** : un fichier unique (permissions.ts/js) au lieu de v-if disperses
- [ ] **Migration sans perte** : les `teacher_channels` existants migrent vers `teacher_projects`, les devoirs existants migrent dans des projets par defaut

## Hypotheses exposees et resolues

| Hypothese | Challenge | Resolution |
|-----------|-----------|-----------|
| "Il suffit de fixer le defaut TA" | Le probleme est structurel, pas ponctuel | Refonte hierarchique complete avec entite Projet |
| "Les TAs sont scopes par canal" | L'utilisateur pense en projets, pas en canaux | Creer l'entite Projet comme unite de scoping |
| "Le TA est un assistant limite" | Trop restrictif pour la realite terrain | TA = enseignant complet sur son perimetre, sans admin |
| "On peut phaser sur 2 semestres" | L'utilisateur veut tout avant septembre | Implementation complete des 4 niveaux avant le pilote |
| "Les permissions fines (R/W) sont necessaires" | Pas un besoin reel au pilote | La hierarchie heritee suffit — simplicite > granularite |
| "Les devoirs peuvent exister sans projet" | L'utilisateur veut le projet comme unite fondamentale | Tout dans un projet, sans exception. Migration des existants |
| "Le TA doit accepter l'assignation" | Trop de friction | Notification + acces auto. Zero friction |
| "L'enseignant perd l'admin" | L'enseignant a besoin de stats et moderation | Enseignant = admin de sa promo. Admin global = modules systeme |

## Contexte technique

### Code existant a migrer

| Fichier | Changement |
|---------|-----------|
| `server/db/schema.js` | Ajouter tables `projects`, `project_travaux`, `project_documents`, `teacher_projects`. Migrer `teacher_channels`. Ajouter role `admin` dans teachers |
| `server/middleware/authorize.js` | Remplacer `requireTeacher` par `requireRole(minRole)`. Inverser defaut TA. Ajouter `requireProject()` |
| `server/routes/admin/index.js` | `requireAdmin` : admin global uniquement. Creer `requirePromoAdmin` pour enseignants |
| `src/main/ipc/helpers.js` | `handleTeacher` → systeme hierarchique avec `handleRole(minRole)` |
| `src/renderer/src/stores/app.ts` | Ajouter `isAdmin`, revoir `isStaff`, `isTeacher` |
| `src/renderer/src/router/index.ts` | Route guards bases sur la hierarchie |
| `server/db/models/teachers.js` | Gestion des intervenants par projet (remplacer canaux) |
| `server/db/models/students.js` | `loginWithCredentials` → gerer le role admin |
| `~20 vues/composants` | Remplacer `v-if="appStore.isTeacher"` par permissions centralisees |

### Architecture cible

```
permissions.ts (source unique de verite)
  ├─ ROLE_HIERARCHY: admin > teacher > ta > student
  ├─ canAccess(userRole, requiredRole): boolean (heritage)
  ├─ canAccessProject(userId, projectId): boolean (scoping TA)
  ├─ canAccessPromoAdmin(userId, promoId): boolean (enseignant de la promo)
  └─ canAccessAdmin(userRole): boolean (admin global only)

middleware/authorize.js
  ├─ requireRole(minRole) → remplace requireTeacher
  ├─ requireProject(getProjectId) → scoping TA par projet
  ├─ requirePromoAdmin(getPromoId) → admin de promo pour enseignants
  └─ requireAdmin() → admin global uniquement
```

### Schema DB cible (nouvelles tables)

```sql
-- Role admin dans teachers
ALTER TABLE teachers ADD COLUMN role TEXT NOT NULL DEFAULT 'teacher'
  CHECK(role IN ('admin', 'teacher', 'ta'));

-- Entite Projet (unite organisationnelle fondamentale)
CREATE TABLE projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  promo_id    INTEGER NOT NULL REFERENCES promos(id),
  name        TEXT NOT NULL,
  description TEXT,
  channel_id  INTEGER REFERENCES channels(id),
  deadline    TEXT,
  created_by  INTEGER NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Liaison Projet <-> Devoirs (tout devoir dans un projet)
CREATE TABLE project_travaux (
  project_id  INTEGER NOT NULL REFERENCES projects(id),
  travail_id  INTEGER NOT NULL REFERENCES travaux(id),
  PRIMARY KEY (project_id, travail_id)
);

-- Liaison Projet <-> Documents
CREATE TABLE project_documents (
  project_id   INTEGER NOT NULL REFERENCES projects(id),
  document_id  INTEGER NOT NULL REFERENCES documents(id),
  PRIMARY KEY (project_id, document_id)
);

-- Assignation TA <-> Projet (remplace teacher_channels)
CREATE TABLE teacher_projects (
  teacher_id  INTEGER NOT NULL REFERENCES teachers(id),
  project_id  INTEGER NOT NULL REFERENCES projects(id),
  can_grade   INTEGER NOT NULL DEFAULT 1,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (teacher_id, project_id)
);

-- Liaison Enseignant <-> Promo (responsabilite)
CREATE TABLE teacher_promos (
  teacher_id  INTEGER NOT NULL REFERENCES teachers(id),
  promo_id    INTEGER NOT NULL REFERENCES promos(id),
  PRIMARY KEY (teacher_id, promo_id)
);

-- Migration : creer un projet par defaut pour chaque devoir existant
-- Migration : transferer teacher_channels vers teacher_projects
-- Migration : DROP TABLE teacher_channels apres verification
```

## Priorite d'implementation

1. **Entite Projet** (DB + CRUD) — fondation de tout le reste
2. **Migration devoirs existants** dans des projets par defaut
3. **Role admin global** (DB + middleware + frontend) — separer admin de teacher
4. **Enseignant = admin de sa promo** (table teacher_promos + admin scope)
5. **Permissions centralisees** (permissions.ts + migration des v-if)
6. **Scoping TA par projet** (teacher_projects + notification auto)
7. **Migration teacher_channels → teacher_projects**
8. **Nettoyage** : supprimer teacher_channels, anciens guards

## Transcription

<details><summary>Voir les Q&R (12 rounds)</summary>

**Round 1 — Objectif** : Le sujet n'est pas d'ajouter des roles mais d'affiner les permissions existantes. Les 3 roles (teacher, ta, student) sont les bons mais les permissions sont trop grossieres.

**Round 2 — Contexte brownfield** : Le probleme prioritaire est le defaut TA permissif (TA sans assignation = acces total via authorize.js:96). Les autres irritants (lecture/ecriture, admin pour TA, sous-roles etudiants) ne sont pas des priorites.

**Round 3 — Contraintes** : 0-2 TAs au pilote, connus personnellement. Config manuelle viable mais le defaut doit etre securise par principe.

**Round 4 — Contradicteur** : Malgre le petit nombre de TAs, le probleme est structurel. Les permissions sont hardcodees dans ~20 fichiers. Il faut un systeme extensible pour Q1 2027 (multi-ecoles).

**Round 5 — Criteres de succes** : Modele choisi = permissions heritees par hierarchie. Clean, previsible.

**Round 6 — Simplificateur** : Reponse custom detaillee. Admin global (Rohan) administre l'app. Plusieurs enseignants possibles, chacun responsable de promos. TAs scopes par projets, pas canaux. Etudiants dans une promo unique.

**Round 7 — Contraintes** : Tout implementer avant septembre. Les TAs seront la des le jour 1 du pilote.

**Round 8 — Ontologiste** : Un TA = enseignant avec moins de droits admin, scope a ses projets. Il fait tout ce que le teacher fait sauf l'admin.

**Round 9 — Criteres de succes** : Projet = nouvelle entite qui regroupe devoir + documents + canal + deadline. Position entre canal et promo. Les TAs sont assignes a des projets.

**Round 10 — Contraintes** : Tout devoir appartient a un projet, sans exception. Un projet par defaut est cree pour le contenu existant lors de la migration.

**Round 11 — Criteres de succes** : Quand un enseignant assigne un projet a un TA, le TA recoit une notification et un acces automatique. Zero friction, pas d'acceptation requise.

**Round 12 — Contexte brownfield** : L'enseignant = admin de sa promo (stats, feedback, moderation de ses canaux, ses etudiants). L'admin global a tout + les modules systeme (securite, maintenance, deploy, sessions, settings, audit).

</details>
