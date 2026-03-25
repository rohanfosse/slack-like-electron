<p align="center">
  <img src="src/renderer/src/assets/logo.png" alt="Cursus" width="80" />
</p>

<h1 align="center">Cursus</h1>

<p align="center">
  Plateforme pedagogique tout-en-un pour l'enseignement superieur.<br />
  Messagerie, devoirs, quiz en direct, documents. Un seul espace pour toute la promotion.
</p>

<p align="center">
  <a href="https://github.com/rohanfosse/cursus/actions"><img src="https://img.shields.io/github/actions/workflow/status/rohanfosse/cursus/test.yml?style=flat-square&label=tests&logo=vitest&logoColor=white" alt="Tests" /></a>
  <a href="https://github.com/rohanfosse/cursus/actions"><img src="https://img.shields.io/badge/typecheck-strict-blue?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://github.com/rohanfosse/cursus/releases"><img src="https://img.shields.io/github/v/release/rohanfosse/cursus?style=flat-square&label=version&color=22c55e" alt="Version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/rohanfosse/cursus?style=flat-square" alt="License" /></a>
  <a href="https://github.com/rohanfosse/cursus/stargazers"><img src="https://img.shields.io/github/stars/rohanfosse/cursus?style=flat-square" alt="Stars" /></a>
  <a href="https://app.cursus.school"><img src="https://img.shields.io/website?url=https%3A%2F%2Fapp.cursus.school&style=flat-square&label=app&logo=statuspage&logoColor=white" alt="App Status" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vue_3-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white" alt="Vue 3" />
  <img src="https://img.shields.io/badge/Electron-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socketdotio&logoColor=white" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/PWA-5A0FC8?style=flat-square&logo=pwa&logoColor=white" alt="PWA" />
  <img src="https://img.shields.io/badge/SSL-A+-22c55e?style=flat-square&logo=letsencrypt&logoColor=white" alt="SSL A+" />
</p>

<p align="center">
  <a href="https://app.cursus.school">Application</a>
  &nbsp;&middot;&nbsp;
  <a href="https://cursus.school">Site web</a>
  &nbsp;&middot;&nbsp;
  <a href="https://admin.cursus.school">Administration</a>
  &nbsp;&middot;&nbsp;
  <a href="https://github.com/rohanfosse/cursus/releases">Telecharger</a>
  &nbsp;&middot;&nbsp;
  <a href="https://github.com/rohanfosse/cursus/discussions">Discussions</a>
</p>

<br />

## Le probleme

Les formations s'appuient sur un patchwork d'outils : mails, groupes WhatsApp, Moodle, dossiers partages sur Teams ou Drive. Les etudiants ratent des annonces, les deadlines se perdent, les enseignants passent plus de temps a relancer qu'a accompagner.

**Cursus reunit tout dans un seul endroit** : messagerie, devoirs, quiz, documents. Accessible en desktop (Electron), en web (PWA) et sur mobile.

<table>
  <tr>
    <td width="33%" valign="top">
      <h4>Moins de friction</h4>
      Chaque action est a un ou deux clics. L'etudiant voit directement ses canaux, ses devoirs et ses documents.
    </td>
    <td width="33%" valign="top">
      <h4>Droit a l'erreur</h4>
      L'etudiant remplace son rendu avant l'echeance sans intervention. Apres la deadline, les depots se verrouillent.
    </td>
    <td width="33%" valign="top">
      <h4>Plus de temps pour l'humain</h4>
      Grilles d'evaluation, notation par lettres, export CSV. Moins de logistique, plus de retours qualitatifs.
    </td>
  </tr>
</table>

<br />

## Fonctionnalites

### Messagerie temps reel

Canaux par promotion, canaux d'annonce en lecture seule, messages prives. Reponses avec citation, reactions emoji, epinglage, mentions `@nom` et `@everyone`, recherche plein texte, notifications desktop. Indicateur de frappe en temps reel. Commandes slash integrees : `/devoir`, `/doc`, `/annonce`, `/sondage`, `/code`.

### Messages prives (DM)

Conversations privees securisees entre etudiants et enseignants. Indicateur en ligne / hors ligne et indicateur de frappe dans le header. Envoi de fichiers et images par drag-and-drop ou bouton trombone. Cache de conversation (60s) pour un switch instantane entre DMs. Isolation totale : un etudiant ne peut acceder qu'a ses propres conversations.

### Devoirs et evaluation

Cinq types de devoirs : livrable, soutenance, CCTL, etude de cas, memoire. Mode brouillon, blocage automatique apres deadline, grilles multicriteres avec ponderation, notation A-F depuis la liste des rendus, feedback individuel, export CSV. Notifications en temps reel a l'etudiant des qu'une note est attribuee.

### Quiz en direct

Sessions interactives avec trois formats : QCM (correction instantanee), sondages (vote libre), nuage de mots (reponses en direct). Resultats affiches en temps reel pour le pilote et partageables avec la classe.

### Documents et ressources

Upload fichiers et liens, categorisation (Moodle, GitHub, LinkedIn, Site Web, Package, Grille). Visionneuse integree pour PDF, images, Word (.docx) et Excel (.xlsx). Drag and drop depuis n'importe quelle page. Recherche et liaison de documents existants aux devoirs. Les ressources ajoutees a un devoir apparaissent automatiquement dans les documents du projet.

### Dashboards personnalisables

**Pilote** : layout Bento-box avec focus widget adaptatif, stats par promotion, frise chronologique interactive, analytique (distribution notes, taux de depot), centre d'actions prioritaires, todo persistant. Widgets optionnels : horloge, citation du jour, pomodoro, liens rapides, fichiers DM, calendrier semaine. Reorganisation par drag-and-drop en mode edition.

**Etudiant** : widgets personnalisables et reorganisables par drag-and-drop (prochaines epreuves, livrables, soutenances, projet en cours, dernier retour, document recent). Widgets optionnels : horloge, citation du jour, calendrier des deadlines, progression globale, liens rapides, pomodoro.

### Frise chronologique

Vue timeline interactive des devoirs par projet. Zoom semaine / mois / trimestre / annee, navigation par drag et molette. Labels au survol avec titre et date. Seuls les devoirs futurs sont affiches. Distribution verticale intelligente pour eviter les chevauchements.

### Kanban par projet

Tableau de bord de suivi par groupe et par devoir. Cartes avec titre, description, assignation. Drag-and-drop entre colonnes (A faire, En cours, Termine).

### REX (Retour d'Experience)

Sessions de retour d'experience interactives. Activites de collecte de feedback en temps reel avec resultats agreges.

### Smart Focus

Sidebar proactive : devoirs a rendre bientot, annonces non lues, notes recentes. Mode Focus pour masquer les distractions.

### Mobile PWA

Navigation tactile avec barre inferieure, swipe entre les vues, optimise pour les petits ecrans.

<br />

## Securite

### Isolation par promotion

Les etudiants ne peuvent acceder qu'aux donnees de leur propre promotion. Chaque endpoint API verifie l'appartenance promo via le middleware `requirePromo`. Les messages de canal sont emis uniquement vers la room Socket.IO de la promotion concernee (pas de broadcast global).

### Controle d'acces par role

Toutes les actions d'administration (CRUD promotions, canaux, devoirs, notes, groupes, intervenants, sessions) sont reservees aux enseignants via le middleware `requireTeacher`. Les etudiants ne peuvent modifier ou supprimer que leurs propres messages (`requireMessageOwner`).

### Confidentialite des DMs

Un etudiant ne peut lire, envoyer ou rechercher que dans ses propres conversations privees (`requireDmParticipant`). Les enseignants ont acces a toutes les boites DM en tant qu'interlocuteurs.

### Protection des donnees

Authentification JWT avec expiration 7 jours, validation Zod sur tous les payloads, hachage bcrypt des mots de passe, protection CSRF, Content-Security-Policy stricte. Export RGPD (Art. 20) des donnees personnelles.

### Securite IPC (Electron)

Les handlers IPC du processus principal verifient le role et la promotion de l'utilisateur via `handleTeacher` et `handlePromo`, reproduisant les memes controles que les routes HTTP.

Voir [SECURITY.md](SECURITY.md) pour les details complets et le signalement de vulnerabilites.

<br />

## Demarrage rapide

> **Prerequis** : [Node.js](https://nodejs.org/) 18+ et npm

```bash
# Cloner le depot
git clone https://github.com/rohanfosse/cursus.git
cd cursus

# Installer les dependances
npm install

# Lancer en mode developpement (Electron + Vite HMR)
npm run dev
```

La base de donnees SQLite est creee automatiquement au premier lancement dans le repertoire utilisateur. Pour charger des donnees de demonstration, ouvrir le panneau d'administration et utiliser **Reinitialiser et peupler**.

### Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance l'application Electron en developpement avec HMR |
| `npm run build` | Compile TypeScript + build Electron (main, preload, renderer) |
| `npm run build:win` | Build + packaging Windows (.exe) |
| `npm run build:mac` | Build + packaging macOS (.dmg) |
| `npm run build:web` | Compile le SPA web (PWA) dans `dist-web/` |
| `npm run server` | Lance le serveur Express (production) |
| `npm run server:dev` | Lance le serveur Express avec watch mode |
| `npm test` | Lance les tests (Vitest) |
| `npm run test:coverage` | Tests avec rapport de couverture |
| `npm run typecheck` | Verification des types TypeScript (vue-tsc) |

<br />

## Deploiement

### Docker (recommande)

```bash
# Build et lancement
docker compose build
docker compose up -d

# Logs
docker logs -f cursus-server
```

Le [Dockerfile](Dockerfile) multi-stage compile le frontend Vue dans un premier stage, puis construit l'image de production avec uniquement le serveur Node.js et les fichiers statiques. L'image finale fait environ 200 Mo.

### Deploiement manuel

```bash
# Build du frontend web
npm run build:web

# Lancement du serveur
NODE_ENV=production PORT=3001 JWT_SECRET=<secret-32-chars> node server/index.js
```

### Variables d'environnement

| Variable | Description | Defaut |
|----------|-------------|--------|
| `PORT` | Port du serveur HTTP | `3001` |
| `JWT_SECRET` | Cle secrete JWT (min 32 caracteres en production) | `changeme-dev-secret` |
| `CORS_ORIGIN` | Origine CORS autorisee | `*` |
| `DB_PATH` | Chemin de la base SQLite | Auto (userData Electron ou racine projet) |
| `UPLOAD_DIR` | Repertoire des fichiers uploades | `uploads/` |
| `VITE_SERVER_URL` | URL du serveur pour le frontend | `http://localhost:3001` |

### Infrastructure

| Service | Domaine | Description |
|---------|---------|-------------|
| Application | [app.cursus.school](https://app.cursus.school) | SPA Vue 3 + Socket.IO |
| Page vitrine | [cursus.school](https://cursus.school) | Landing page statique |
| Administration | [admin.cursus.school](https://admin.cursus.school) | Console de monitoring |

L'infrastructure de production utilise Docker + Nginx + Let's Encrypt sur un VPS. Le deploiement est automatise via GitHub Actions : chaque push sur `main` declenche un rebuild Docker et un redemarrage du container. Les mises a jour Electron sont silencieuses (NSIS oneClick).

<br />

## Architecture

```
cursus/
  src/
    main/              Processus principal Electron
    preload/           Bridge IPC securise (contextBridge)
    renderer/          Frontend Vue 3 + TypeScript + Pinia
    web/               PWA shim (remplace IPC par HTTP)
    landing/           Page vitrine
  server/
    db/                SQLite : connexion, schema, migrations, models
    routes/            API REST (18 domaines + admin modulaire)
    middleware/        Auth JWT, validation Zod, autorisation (role + promo)
    public/            Console d'administration
  tests/
    frontend/          Tests unitaires utils + stores
    backend/           Tests models + routes + middleware + securite
  config/              Nginx, PM2, ecosystem
  resources/           Icones, installer assets
```

### Stack technique

| Couche | Technologies |
|--------|-------------|
| Desktop | Electron 29, context isolation, sandbox, auto-update silencieux (electron-updater, NSIS oneClick) |
| Frontend | Vue 3 Composition API, TypeScript strict, Pinia, Vue Router, vue-draggable-plus |
| Backend | Express 4, Socket.IO 4, SQLite (Better-SQLite3), JWT, Zod, bcrypt |
| Build | electron-vite, Vite 6, electron-builder, Rollup |
| Mobile | PWA, service worker (stale-while-revalidate), Web App Manifest |
| CI/CD | GitHub Actions (tests, deploy Docker, release Windows/macOS, Lighthouse, CodeQL) |
| Deploiement | Docker multi-stage, Nginx reverse proxy, Let's Encrypt, auto-deploy via webhook |
| Qualite | Vitest, Supertest, vue-tsc strict, Lighthouse CI, CodeQL, Dependabot |

<br />

## Contribuer

Les contributions sont les bienvenues. Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour le guide complet.

### Workflow

```
dev (developpement) ──PR──> main (production)
                              |
                              +-- Tests CI obligatoires
                              +-- Deploy Docker automatique
                              +-- Release Windows/macOS (sur tag)
```

```bash
git checkout dev              # branche de travail
npm run dev                   # developpement avec HMR
npx vue-tsc --noEmit          # verifier les types avant de commit
npm test                      # lancer les tests
git push origin dev           # pousser sur dev
# Ouvrir une PR vers main sur GitHub
```

### Conventions

- **Commits** : prefixes `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`
- **Code** : TypeScript strict, Composition API, composables documentes
- **CSS** : variables CSS dans `base.css`, pas de couleurs hardcodees
- **Tests** : couvrir les utilitaires, composables et endpoints critiques

<br />

## Licence

Distribue sous licence [MIT](LICENSE).

Concu et developpe par [Rohan Fosse](https://github.com/rohanfosse).
