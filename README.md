# Plateforme de Communication pour l'Enseignement

Application de bureau collaborative conçue spécifiquement pour le milieu éducatif. Elle associe la réactivité d'une messagerie instantanée à la structure d'un environnement d'apprentissage numérique, offrant un espace de travail unifié pour les étudiants et les équipes pédagogiques — sans dépendance réseau, sans données en cloud.

## Philosophie du projet

L'application a été pensée autour de trois axes majeurs :

* **Réduction de la charge cognitive** : Interface minimaliste, navigation contextuelle (barre latérale, palette de commandes globale) pour limiter les distractions et recentrer l'attention sur l'apprentissage.
* **Droit à l'erreur** : Système de dépôt sécurisant permettant aux étudiants de remplacer un rendu de manière autonome avant son échéance.
* **Optimisation du temps de correction** : Grilles d'évaluation par critères, notation par lettres et export CSV, pour que l'enseignant consacre son énergie aux retours qualitatifs.

---

## Fonctionnalités

### Messagerie

* Canaux publics, canaux d'annonce (lecture seule pour les étudiants) et messages privés
* Réponse / citation avec aperçu du message d'origine
* Épinglage de messages essentiels (jusqu'à 5 par canal)
* Réactions par emoji, modification et suppression avec horodatage
* Détection des mentions (`@nom`, `@everyone`) avec compteurs non lus
* Recherche plein texte dans les messages d'un canal
* Pagination infinie par curseur (50 messages par page)
* Notifications de bureau natives pour les nouveaux messages mentionnant l'utilisateur

### Travaux & Évaluation

* Types d'exercices : livrable, soutenance, CCTl, étude de cas, mémoire, autre
* Mode brouillon / publication contrôlée par l'enseignant
* Blocage automatique des dépôts hors délai (sauf soutenance et CCTl)
* Grilles d'évaluation multicritères pondérées, indépendantes par devoir
* Notation par lettres (A → F) directement depuis la liste des rendus
* Commentaires de retour par devoir, export des notes en CSV

### Documents & Ressources

* Documents attachés à un canal ou à un projet entier (fichier ou lien externe)
* Visionneuse intégrée pour PDF, images, `.docx`, `.xlsx` et feuilles de calcul
* Catégorisation libre et description textuelle

### Groupes & Promotions

* Gestion de promotions avec couleur de promotion
* Groupes de travail avec membres, canaux privés associés et devoirs ciblés
* Importation en masse des étudiants par CSV

### Interface & Ergonomie

* Barre de titre native personnalisée (minimiser, maximiser, fermer)
* Palette de commandes globale (raccourci clavier)
* Panneaux latéraux contextuels : détails d'un devoir ou profil d'un étudiant
* Toast notifications pour les actions non bloquantes
* Système de modales centralisé (25+ modales spécialisées)
* Menus contextuels sur les messages

### Administration

* Vue tableau de bord enseignant : avancement des dépôts par promo
* Planificateur visuel des jalons (vue chronologique)
* Rappels automatiques de deadline (J−1) via notifications système
* Réinitialisation et peuplement de la base avec des données de démonstration

---

## Architecture technique

```text
┌─────────────────────┐        IPC (contextBridge)       ┌──────────────────────┐
│   Main Process      │ ◄──────────────────────────────► │  Renderer Process    │
│   (Node.js)         │                                   │  (Vue 3 + Pinia)     │
│                     │   win.webContents.send(msg:new)   │                      │
│  - ipc.js           │ ──────────────────────────────►   │  - stores/           │
│  - notifications.js │                                   │  - views/            │
│                     │                                   │  - components/       │
└────────┬────────────┘                                   └──────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Database Layer     │
│  (Better-SQLite3)   │
│                     │
│  - schema.js  v14   │
│  - models/          │
└─────────────────────┘
```

**Main process** — Electron 29, Node.js, gestion du cycle de vie, IPC handlers, planificateur de notifications.
**Renderer** — Vue 3 (Composition API), TypeScript, Pinia, Vue Router, rendu markdown via Marked + Highlight.js.
**Base de données** — SQLite (WAL mode, foreign keys), schéma versionné avec migrations incrémentales jusqu'à v14.
**Build** — electron-vite + Vite 6, packaging via electron-builder.

### Sécurité Electron

* Context isolation activé, Node integration désactivé dans le renderer
* Toutes les API natives exposées exclusivement via `contextBridge`
* Validation des chemins fichiers (`assertSafePath`) et limite de lecture à 50 Mo
* Prepared statements partout (pas d'interpolation SQL directe)

---

## Stack

| Couche | Technologie | Version |
| --- | --- | --- |
| Runtime desktop | Electron | 29 |
| UI framework | Vue 3 (Composition API) | 3.5 |
| État global | Pinia | 2.3 |
| Routage | Vue Router | 4.6 |
| Build | electron-vite + Vite | 3.1 / 6.4 |
| Langage | TypeScript | 5.9 |
| Base de données | Better-SQLite3 | 9.4 |
| Icônes | Lucide Vue | 0.577 |
| Markdown | Marked + Highlight.js | 17 / 11 |
| Docs Office | Mammoth (.docx), XLSX | — |

---

## Installation

```bash
# 1. Cloner le dépôt
git clone <url-du-repo>
cd slack-like-electron

# 2. Installer les dépendances
npm install

# 3. Lancer en mode développement
npm run dev

# 4. Construire l'exécutable
npm run build
```

La base de données est créée automatiquement au premier lancement dans le répertoire `userData` d'Electron.
Pour peupler l'application avec des données de démonstration, utiliser le bouton **Réinitialiser et peupler** dans le panneau d'administration enseignant.

---

## Pistes d'évolution

Les fonctionnalités suivantes représentent des axes d'amélioration naturels du projet, classés par priorité et complexité.

### Priorité haute — valeur immédiate

| Fonctionnalité | Description | Complexité |
| --- | --- | --- |
| **Fils de discussion (threads)** | Panneau latéral dédié pour répondre dans un fil sans polluer le canal principal, à l'instar de Slack | Moyenne |
| **Sélecteur d'emoji** | Picker complet (EmojiMart) pour les réactions et la saisie de messages | Faible |
| **Brouillons automatiques** | Sauvegarde du message en cours de rédaction lors d'un changement de canal | Faible |
| **Recherche globale** | Recherche plein texte cross-canal avec filtres (auteur, date, canal) | Moyenne |
| **Centre de notifications** | Cloche avec historique des mentions, réponses et deadlines, sans quitter la vue actuelle | Moyenne |
| **Mode clair** | Thème clair alternatif, avec persistance du choix dans les préférences utilisateur | Faible |

### Priorité moyenne — enrichissement pédagogique

| Fonctionnalité | Description | Complexité |
| --- | --- | --- |
| **Accusés de réception des annonces** | Confirmation de lecture obligatoire pour les annonces importantes, suivi par l'enseignant | Moyenne |
| **Sondages dans les canaux** | Création de votes rapides (choix unique ou multiple) directement dans un message | Moyenne |
| **Vue calendrier des jalons** | Calendrier mensuel affichant deadlines et soutenances, avec navigation et filtres par promo | Moyenne |
| **Portfolio étudiant** | Page récapitulative par étudiant : tous ses dépôts, notes et feedbacks sur le semestre | Moyenne |
| **Évaluation par les pairs** | Permettre à des étudiants d'évaluer le travail d'autres groupes selon une grille définie | Élevée |
| **Historique de versions** | Conservation des versions successives d'un dépôt avec diff visuel | Élevée |
| **Statistiques d'engagement** | Taux de lecture des annonces, activité par canal, heure de pic — vue enseignant | Moyenne |

### Priorité basse — vision long terme

| Fonctionnalité | Description | Complexité |
| --- | --- | --- |
| **Export PDF des rapports** | Rapport de progression semestrielle par étudiant, exportable et imprimable | Moyenne |
| **Sauvegarde et restauration** | Export/import de la base de données SQLite depuis l'interface, avec chiffrement optionnel | Faible |
| **Notifications sonores** | Sons distincts pour mentions, messages DM et rappels de deadline | Faible |
| **Raccourcis clavier étendus** | Navigation complète au clavier (canaux, messages, modales) avec aide contextuelle | Moyenne |
| **Présence / statut** | Indicateur de présence en ligne pour les étudiants connectés (multi-instance locale) | Élevée |
| **Messages vocaux** | Enregistrement audio court (feedback enseignant, question étudiant) | Élevée |
| **Intégration IA** | Suggestions de feedback automatiques sur les dépôts via l'API Claude, à valider par l'enseignant | Élevée |
| **Synchronisation cloud** | Réplication optionnelle de la base sur un serveur distant pour usage multi-poste | Très élevée |

---

## Structure du projet

```text
src/
├── main/
│   ├── index.ts          # Point d'entrée Electron, création de fenêtre
│   ├── ipc.js            # ~100 handlers IPC (toute la logique métier)
│   └── notifications.js  # Planificateur de rappels deadline (toutes les 30 min)
├── preload/
│   └── index.ts          # Surface API exposée au renderer via contextBridge
├── db/
│   ├── schema.js         # Schéma SQLite + migrations v0 → v14
│   ├── connection.js     # Singleton de connexion
│   ├── seed.js           # Données de démonstration
│   └── models/           # Un fichier par domaine métier
│       ├── messages.js
│       ├── assignments.js
│       ├── submissions.js
│       ├── groups.js
│       ├── documents.js
│       ├── rubrics.js
│       ├── students.js
│       └── promotions.js
└── renderer/src/
    ├── views/            # 4 vues principales : Messages, Devoirs, Documents, Dashboard
    ├── components/       # ~50 composants (chat, modales, sidebar, layout)
    ├── stores/           # 5 stores Pinia (app, messages, travaux, documents, modals)
    ├── composables/      # useToast, usePrefs, useOpenExternal
    └── router/           # Routing hash-based, 4 routes
```
