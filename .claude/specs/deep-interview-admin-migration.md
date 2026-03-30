---
subject: Migration admin panel vers Vue 3 (hybride)
type: brownfield
rounds: 6
ambiguity: 13%
created: 2026-03-30
---

# Specification : Migration admin panel Vue 3 hybride

## Scores de clarte

| Dimension | Score | Poids | Contribution |
|-----------|-------|-------|-------------|
| Objectif | 0.95 | 35% | 0.33 |
| Contraintes | 0.70 | 25% | 0.18 |
| Criteres de succes | 0.80 | 25% | 0.20 |
| Contexte | 0.70 | 15% | 0.11 |
| **Total** | | | **0.87 (13% ambiguite)** |

## Objectif

Migrer 3 onglets admin (Users, Modules, Stats) du site externe vanilla JS (`admin.cursus.school`) vers une section Vue 3 integree dans l'app principale, accessible uniquement au role `admin`. Les 11 onglets restants (deploy, maintenance, Docker, audit, securite, sessions, moderation, annonces, feedback, erreurs, import) restent sur le site externe.

## Contraintes

- Acces : role `admin` uniquement (pas teacher, pas TA)
- Route : `/admin` dans l'app Vue 3 (route guard avec `requiredRole: 'admin'`)
- Les endpoints backend (`/api/admin/*`) ne changent pas
- Le site externe `admin.cursus.school` reste operationnel pour les ops (deploy, maintenance, etc.)
- Reutiliser les composants Vue existants (Modal, Toast, stores Pinia, theme CSS)
- Pas de nouvelle dependance frontend

## Non-objectifs (hors scope)

- Migrer les onglets ops (deploy, Docker, nginx, maintenance, backup)
- Migrer audit, securite, sessions, moderation, annonces, feedback, erreurs, import
- Ajouter du SSO/OAuth/2FA
- Changer la structure backend ou les endpoints API
- Creer des roles admin granulaires

## Criteres d'acceptation

### Users (parite + bulk actions)
- [ ] Lister/chercher les utilisateurs (etudiants, teachers, TAs) avec filtres par type et promo
- [ ] Voir le detail d'un user (activite, messages, depots, derniere connexion)
- [ ] Editer nom/email/promo d'un user
- [ ] Reset password (genere un mot de passe temporaire)
- [ ] Supprimer un user (sauf teachers)
- [ ] **Amelioration : selection multiple + actions groupees** (reset password en batch, supprimer en batch, changer de promo en batch)

### Modules (parite)
- [ ] Toggle des 5 modules enrichissement (kanban, frise, rex, live, signatures)
- [ ] Etat visible immediatement (reactif)

### Stats (parite + temps reel)
- [ ] Statistiques 30 jours : messages/jour, depots/jour, visites, logins
- [ ] Heatmap d'activite (90 jours, par jour/heure)
- [ ] Metriques adoption : DAU/WAU/MAU, etudiants inactifs
- [ ] **Amelioration : stats temps reel** via Socket.io (users connectes, derniere activite live)

### UX native
- [ ] Section admin dans la NavRail (visible uniquement pour admin)
- [ ] Memes composants UI que le reste de l'app (Modal, Toast, theme dark/light)
- [ ] Navigation fluide sans changer de contexte (pas d'ouverture de nouvel onglet)

## Hypotheses exposees et resolues

| Hypothese | Challenge | Resolution |
|-----------|-----------|-----------|
| "Il faut migrer tout l'admin" | 14 onglets, c'est enorme. Lesquels utilises-tu vraiment ? | Seulement 3 : Users, Modules, Stats |
| "Teachers doivent aussi y acceder" | Qui voit quoi dans l'app ? | Admin only. Teachers gardent le site externe |
| "La parite suffit" | Pourquoi migrer si c'est pareil ? | Parite + 3 ameliorations : UX native, stats temps reel, bulk actions |
| "Beaucoup d'ameliorations possibles" | Lesquelles comptent pour le pilote ? | UX native (fluidite), stats RT (visibilite), bulk users (efficacite) |

## Contexte technique

### Fichiers a creer
```
src/renderer/src/views/AdminView.vue        — Vue principale admin (layout + onglets)
src/renderer/src/components/admin/
  AdminUsers.vue                             — Gestion utilisateurs + bulk actions
  AdminModules.vue                           — Toggle modules
  AdminStats.vue                             — Statistiques + temps reel
  AdminUserDetail.vue                        — Modal detail user
```

### Fichiers a modifier
```
src/renderer/src/router/index.ts            — Ajouter route /admin (requiredRole: admin)
src/renderer/src/components/layout/NavRail.vue — Ajouter bouton admin (v-if isAdmin)
src/preload/index.ts                         — Exposer les API admin manquantes
```

### Endpoints backend existants (pas de modification)
- `GET /api/admin/users` — liste + recherche
- `GET /api/admin/users/:id` — detail
- `PATCH /api/admin/users/:id` — edit
- `POST /api/admin/users/:id/reset-password` — reset
- `DELETE /api/admin/users/:id` — suppression
- `GET /api/admin/modules` — etat modules
- `POST /api/admin/modules` — toggle
- `GET /api/admin/stats` — stats globales
- `GET /api/admin/heatmap` — heatmap
- `GET /api/admin/adoption` — DAU/WAU/MAU
- `GET /api/admin/last-seen` — derniere activite

### Patterns existants a reutiliser
- `useApi` composable pour les appels HTTP
- `useToast` pour les notifications
- `useConfirm` pour les confirmations
- `usePermissions` pour les checks role
- Stores Pinia (appStore pour currentUser)
- Composant `Modal.vue` pour les modales
- Socket.io client deja connecte dans l'app

## Transcription

<details><summary>Voir les Q&R</summary>

**Round 1 — Objectif** : Qu'est-ce qui te pousse a travailler sur l'admin ?
→ Migration tech (le vanilla JS ne scale plus)

**Round 2 — Objectif** : Quelle cible ? Integre, separe, ou hybride ?
→ Vue 3 hybride (features quotidiennes dans l'app, ops sur le site externe)

**Round 3 — Contraintes** : Qui accede a la section admin dans l'app ?
→ Admin only (pas teacher, pas TA)

**Round 4 — Criteres (Contradicteur)** : Sur 14 onglets, lesquels utilises-tu vraiment ?
→ Users + Modules + Stats (3 sur 14)

**Round 5 — Criteres** : Parite ou ameliorations ?
→ Parite + ameliorations

**Round 6 — Contraintes (Simplificateur)** : Quelles ameliorations concretement ?
→ UX native + Stats temps reel + Bulk actions users

</details>
