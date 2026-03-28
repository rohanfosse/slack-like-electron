---
name: roles-permissions
description: Refonte hierarchique des roles (admin, enseignant, TA, etudiant) avec entite Projet et permissions centralisees
status: backlog
created: 2026-03-28T21:23:03Z
---

# PRD: roles-permissions

## Executive Summary

Remplacer le systeme de permissions binaire actuel (hardcode via `v-if` et middleware dans ~20 fichiers) par une hierarchie heritee a 4 niveaux (admin global, enseignant, TA, etudiant). Introduire l'entite **Projet** comme unite organisationnelle fondamentale : tout devoir, document et canal appartient a un projet. Les TAs sont scopes par projet avec notification et acces automatique. Les enseignants deviennent admins de leurs promos. L'admin global conserve les modules systeme.

## Problem Statement

Le systeme de permissions actuel souffre de trois problemes structurels :

1. **Defaut TA dangereux** : un TA sans assignation de canaux a acces a tout (`authorize.js:96`), y compris les DMs et toutes les promos. C'est un trou de securite par design (backward-compat).

2. **Permissions hardcodees partout** : `v-if="appStore.isTeacher"` dans les vues, `requireTeacher` dans les middlewares, `handleTeacher` dans les IPC handlers. Ajouter un role ou une permission = modifier des dizaines de fichiers.

3. **Pas de concept de "projet"** : les TAs sont assignes a des canaux (`teacher_channels`), mais la realite pedagogique est organisee en projets (devoir + documents + canal + deadline). Le modele de donnees ne reflete pas la realite metier.

Ces problemes bloquent l'extensibilite vers le multi-etablissement (Q1 2027) et creent des risques de securite pour le pilote de septembre 2026.

## User Stories

### US-1 : Admin global gere l'infrastructure

**En tant qu'** admin global (Rohan),
**je veux** avoir un acces exclusif aux modules systeme (securite, maintenance, deploy, sessions, settings, audit),
**afin de** garantir que seul l'administrateur peut modifier la configuration globale et surveiller l'infrastructure.

**Criteres d'acceptation :**
- Seul le role `admin` peut acceder aux routes `/api/admin/security`, `/admin/maintenance`, `/admin/deploy`, `/admin/sessions`, `/admin/settings`, `/admin/audit`
- Un enseignant qui tente d'acceder a ces routes recoit un 403
- Le panel admin affiche uniquement les modules autorises selon le role

### US-2 : Enseignant administre sa promo

**En tant qu'** enseignant responsable pedagogique,
**je veux** voir les stats, feedback, moderation et utilisateurs de mes promos uniquement,
**afin de** gerer mes promotions sans avoir acces aux donnees des autres enseignants ni aux modules systeme.

**Criteres d'acceptation :**
- L'enseignant voit un panel admin restreint a ses promos (stats, feedback, moderation de ses canaux, ses etudiants)
- L'enseignant ne voit pas les modules systeme (securite, maintenance, deploy, sessions, settings, audit)
- L'enseignant est lie a ses promos via la table `teacher_promos`
- Un enseignant ne peut pas voir les stats d'une promo qui ne lui est pas assignee

### US-3 : Enseignant cree et assigne des projets

**En tant qu'** enseignant,
**je veux** creer des projets dans mes promos et assigner des TAs a ces projets,
**afin de** organiser le travail pedagogique et deleguer la correction aux intervenants.

**Criteres d'acceptation :**
- L'enseignant peut creer un projet (nom, description, deadline) dans une de ses promos
- Un projet regroupe des devoirs, documents et un canal de communication
- L'enseignant peut assigner un ou plusieurs TAs a un projet
- A l'assignation, le TA recoit une notification automatique et un acces immediat
- Tout devoir doit appartenir a un projet (pas de devoirs libres)

### US-4 : TA travaille sur ses projets assignes

**En tant qu'** intervenant (TA),
**je veux** voir et agir uniquement sur les projets qui me sont assignes,
**afin de** corriger les devoirs, consulter les documents et communiquer avec les etudiants dans mon perimetre.

**Criteres d'acceptation :**
- Le TA voit dans sa sidebar uniquement les projets qui lui sont assignes
- Pour chaque projet assigne, le TA peut : voir le chat, les documents, les devoirs, noter les copies
- Le TA ne peut pas creer de nouveaux projets, devoirs ou quiz
- Un TA sans aucun projet assigne a zero acces (pas de fallback permissif)
- Le TA ne peut pas acceder au panel admin (ni global ni promo)

### US-5 : Etudiant inchange

**En tant qu'** etudiant,
**je veux** que mon experience reste identique,
**afin de** ne pas etre impacte par la refonte des permissions enseignant/TA.

**Criteres d'acceptation :**
- L'etudiant appartient a une promo unique
- L'etudiant voit ses devoirs, messages, notes comme avant
- Aucune regression dans le parcours etudiant

### US-6 : Migration transparente des donnees existantes

**En tant qu'** admin,
**je veux** que tous les devoirs existants soient migres dans des projets par defaut et que les `teacher_channels` soient converties en `teacher_projects`,
**afin de** passer au nouveau systeme sans perte de donnees.

**Criteres d'acceptation :**
- Chaque devoir existant est place dans un projet par defaut (nomme d'apres le devoir)
- Les assignations `teacher_channels` sont converties en `teacher_projects` via les projets correspondants
- La table `teacher_channels` est supprimee apres verification
- Aucune donnee perdue pendant la migration
- L'app fonctionne correctement apres migration sans intervention manuelle

## Functional Requirements

### FR-1 : Hierarchie de roles

```
admin > teacher > ta > student
```

Chaque role herite des permissions du niveau inferieur. La verification se fait via un fichier centralise `permissions.ts` avec une fonction `canAccess(userRole, requiredRole)`.

### FR-2 : Entite Projet

Nouvelles tables DB :
- `projects` : id, promo_id, name, description, channel_id, deadline, created_by, created_at
- `project_travaux` : project_id, travail_id (tout devoir dans un projet)
- `project_documents` : project_id, document_id
- `teacher_projects` : teacher_id, project_id, can_grade, assigned_at (remplace `teacher_channels`)
- `teacher_promos` : teacher_id, promo_id (liaison enseignant-promo)

### FR-3 : Middleware hierarchique

Remplacer les guards actuels :
- `requireTeacher` → `requireRole('teacher')` (accepte teacher et admin)
- `requireAdmin` → `requireRole('admin')` (admin global uniquement)
- Nouveau : `requireProject(getProjectId)` pour scoper les TAs
- Nouveau : `requirePromoAdmin(getPromoId)` pour les enseignants admin de leur promo

### FR-4 : IPC hierarchique

Remplacer dans `src/main/ipc/helpers.js` :
- `handleTeacher` → `handleRole('teacher')`
- Nouveau : `handleProject(getProjectId)` pour les operations TA

### FR-5 : Frontend permissions centralisees

- Un fichier `permissions.ts` dans le renderer
- `appStore` expose : `isAdmin`, `isTeacher`, `isStaff` (admin + teacher + ta), `isStudent`
- Les vues utilisent des computed importes de `permissions.ts` au lieu de `v-if` hardcodes
- Le router utilise des meta-guards bases sur la hierarchie

### FR-6 : Panel admin scope

- Admin global : tous les 13 modules actuels
- Enseignant : stats de sa promo, feedback de sa promo, moderation de ses canaux, liste de ses etudiants
- TA : aucun acces admin

### FR-7 : Flux d'assignation TA

1. Enseignant cree un projet dans une promo
2. Enseignant assigne un TA au projet
3. Notification automatique au TA
4. Le projet apparait dans la sidebar du TA avec acces immediat
5. Le TA peut voir chat, documents, copies a corriger

## Non-Functional Requirements

- **Securite** : defaut restrictif pour les TAs (zero acces si pas de projet assigne). Aucun fallback permissif.
- **Performance** : la verification de permissions ne doit pas ajouter plus de 5ms par requete (lookup en memoire ou cache).
- **Retrocompatibilite** : migration automatique des donnees existantes sans intervention manuelle.
- **Maintenabilite** : un seul fichier source pour les permissions (`permissions.ts` / `permissions.js`), pas de logique dispersee.
- **Extensibilite** : le systeme de hierarchie doit permettre d'ajouter un niveau `super-admin` en Q1 2027 sans refonte.

## Success Criteria

- Les 4 roles (admin, teacher, ta, student) fonctionnent avec heritage hierarchique
- Un TA sans projet assigne a zero acces (verifie par test)
- Tout devoir appartient a un projet (pas de devoirs orphelins)
- Les ~20 fichiers avec permissions hardcodees utilisent le systeme centralise
- La migration des donnees existantes est automatique et sans perte
- Le panel admin affiche les bons modules selon le role
- Le flux d'assignation TA fonctionne avec notification automatique

## Constraints & Assumptions

- **Un seul developpeur** avec 10-20h/semaine
- **Deadline : septembre 2026** (pilote avec ~30 etudiants)
- **0-2 TAs au pilote**, mais le systeme doit etre propre des le jour 1
- **SQLite** comme DB (pas de migration vers Postgres pour le moment)
- **Electron-only** (pas de version web pour le pilote)
- Le schema `teachers.role` existe deja avec `CHECK(role IN ('teacher','ta'))`, il faut ajouter `'admin'`

## Out of Scope

- Sous-roles etudiants (delegue, tuteur, chef de projet)
- Permissions granulaires lecture/ecriture par action (la hierarchie heritee suffit)
- RBAC dynamique avec permissions custom par utilisateur
- Multi-etablissement / super-admin par ecole (Q1 2027)
- Systeme d'invitation avec acceptation pour les TAs
- Version web de l'application

## Dependencies

- **Deep interview spec** : `.claude/specs/deep-interview-roles-permissions.md` (source des requirements)
- **Schema DB existant** : `server/db/schema.js` (tables teachers, students, channels, travaux, documents, teacher_channels)
- **Middleware existant** : `server/middleware/authorize.js` (guards a remplacer)
- **Stores frontend** : `src/renderer/src/stores/app.ts` (computed roles a etendre)
- **Systeme de notifications** : deja en place (notif desktop + in-app) pour le flux d'assignation TA
