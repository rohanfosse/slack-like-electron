<p align="center">
  <img src="src/renderer/src/assets/logo.png" alt="Cursus" width="80" />
  <br />
  <strong style="font-size: 2em;">Cursus</strong>
</p>

<p align="center">
  <strong>La plateforme de communication pensee pour l'enseignement.</strong>
  <br />
  Messagerie, travaux, documents, quiz en direct. Tout au meme endroit.
</p>

<p align="center">
  <a href="https://github.com/rohanfosse/slack-like-electron/actions"><img src="https://img.shields.io/github/actions/workflow/status/rohanfosse/slack-like-electron/release.yml?style=flat-square&label=build" alt="Build" /></a>
  <a href="https://github.com/rohanfosse/slack-like-electron/releases"><img src="https://img.shields.io/github/v/release/rohanfosse/slack-like-electron?style=flat-square&label=version" alt="Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/rohanfosse/slack-like-electron?style=flat-square" alt="License" /></a>
  <a href="https://github.com/rohanfosse/slack-like-electron/stargazers"><img src="https://img.shields.io/github/stars/rohanfosse/slack-like-electron?style=flat-square" alt="Stars" /></a>
</p>

<p align="center">
  <a href="https://app.cursus.school"><img src="https://img.shields.io/badge/Application-app.cursus.school-4f46e5?style=for-the-badge&logo=google-chrome&logoColor=white" alt="App" /></a>
  &nbsp;
  <a href="https://cursus.school"><img src="https://img.shields.io/badge/Site_web-cursus.school-4f46e5?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Site web" /></a>
  &nbsp;
  <a href="https://github.com/rohanfosse/slack-like-electron/issues"><img src="https://img.shields.io/badge/Issues-GitHub-24292e?style=for-the-badge&logo=github&logoColor=white" alt="Issues" /></a>
  &nbsp;
  <a href="https://github.com/rohanfosse/slack-like-electron/releases"><img src="https://img.shields.io/badge/Releases-Telecharger-22c55e?style=for-the-badge&logo=windows&logoColor=white" alt="Releases" /></a>
</p>

<br />

## Pourquoi Cursus ?

Les formations s'appuient sur un patchwork d'outils : mails institutionnels, groupes WhatsApp, Moodle, dossiers partages sur Teams ou Drive. Chaque outil couvre un besoin, mais aucun ne couvre le quotidien. Les etudiants ratent des annonces parce qu'elles sont sur le mauvais canal. Les enseignants passent plus de temps a relancer qu'a accompagner. Les deadlines se perdent entre trois plateformes.

Cursus part d'un constat simple : **une promo a besoin d'un seul endroit pour communiquer, deposer du travail et acceder a ses ressources**. L'application remplace la dispersion par un espace unifie, accessible en version desktop (Electron), en version web (PWA) et sur mobile.

<table>
  <tr>
    <td width="33%" valign="top">
      <strong>Moins de friction</strong><br />
      L'interface est construite pour que chaque action soit a un ou deux clics. Un etudiant qui ouvre l'application voit directement ses canaux, ses devoirs en cours et ses documents.
    </td>
    <td width="33%" valign="top">
      <strong>Droit a l'erreur</strong><br />
      Un etudiant peut remplacer son rendu avant l'echeance sans demander a l'enseignant. Apres la deadline, les depots se verrouillent automatiquement.
    </td>
    <td width="33%" valign="top">
      <strong>Plus de temps pour l'humain</strong><br />
      Grilles d'evaluation par criteres, notation par lettres, export CSV. L'enseignant passe moins de temps sur la logistique et plus sur les retours qualitatifs.
    </td>
  </tr>
</table>

<br />

## Fonctionnalites

### Messagerie

Canaux publics organises par promotion ou par thematique. Canaux d'annonce en lecture seule pour les communications officielles. Messages prives entre etudiants ou avec les enseignants. Chaque message supporte les reponses avec citation du message d'origine, les reactions par emoji, l'epinglage (jusqu'a 5 par canal) et les mentions `@nom` ou `@everyone` avec compteur de non-lus. La recherche plein texte permet de retrouver n'importe quel message dans un canal. Les notifications de bureau signalent les mentions et les messages directs.

Des commandes slash sont disponibles directement dans la zone de saisie : `/devoir`, `/doc`, `/annonce`, `/sondage` et d'autres raccourcis pour creer du contenu sans quitter la conversation.

### Travaux et evaluation

L'enseignant cree un devoir en choisissant son type (livrable, soutenance, CCTL, etude de cas, memoire) et sa date limite. Un mode brouillon permet de preparer un devoir sans le rendre visible. Une fois publie, les etudiants deposent leur travail depuis l'application. Les depots sont automatiquement bloques apres l'echeance, sauf pour les soutenances et CCTL qui suivent un calendrier different.

Chaque devoir peut avoir sa propre grille d'evaluation multicriteres avec ponderation. La notation se fait par lettres (A a F) directement depuis la liste des rendus, avec possibilite d'ajouter un commentaire de retour individuel. Les notes sont exportables en CSV pour integration dans les outils de scolarite. Les etudiants recoivent une notification en temps reel via Socket.IO des qu'une note est attribuee.

### Quiz en direct (Live)

L'enseignant peut lancer une session interactive en direct avec ses etudiants. Trois formats sont disponibles : QCM (questions a choix multiples avec correction instantanee), sondages (vote anonyme ou nominatif) et nuage de mots (les reponses apparaissent en direct a l'ecran). Les resultats s'affichent en temps reel pour le professeur et peuvent etre partages avec la classe.

### Documents et ressources

Fichiers et liens externes attaches a un canal ou a un projet entier. Les documents peuvent etre categorises et decrits. La visionneuse integree ouvre les PDF, les images, les documents Word (.docx) et les tableurs Excel (.xlsx) sans quitter l'application.

### Promotions et groupes

Chaque promotion dispose de sa couleur et de ses canaux dedies. Les groupes de travail sont crees par l'enseignant avec des membres assignes, un canal prive automatique et des devoirs cibles. L'import en masse des etudiants se fait par fichier CSV.

### Dashboard enseignant

Vue d'ensemble de l'avancement des depots par promotion avec indicateurs visuels. Frise chronologique des jalons (deadlines, soutenances, examens). Rappels automatiques envoyes la veille de chaque echeance. Analytique par promotion : repartition des notes, taux de depot, activite recente.

### Dashboard etudiant

Vue personnalisee avec les devoirs a rendre classes par urgence, les notes recues (systeme A/B/C/D), les annonces recentes et l'acces rapide aux canaux et documents de sa promotion. Le dashboard est personnalisable avec des widgets que l'etudiant peut reorganiser selon ses besoins.

### Smart Focus et notifications

La sidebar Smart Focus regroupe les informations proactives : devoirs a rendre bientot, annonces non lues, notes recemment publiees. Un mode Focus (zen) permet de masquer temporairement toutes les notifications et distractions pour se concentrer sur une tache.

### Mobile PWA

L'application est accessible sur mobile via une Progressive Web App. La navigation utilise une barre inferieure adaptee au tactile, le pull-to-refresh recharge les donnees et le swipe permet de naviguer entre les vues. L'experience est optimisee pour les ecrans de petite taille.

<br />

## Demarrage rapide

**Prerequis** : Node.js 18+ et npm.

```bash
git clone https://github.com/rohanfosse/slack-like-electron.git
cd slack-like-electron
npm install
```

Lancer en developpement :

```bash
npm run dev
```

Construire l'executable :

```bash
npm run build
```

La base de donnees SQLite est creee automatiquement au premier lancement dans le repertoire utilisateur. Pour charger des donnees de demonstration, ouvrir le panneau d'administration et utiliser **Reinitialiser et peupler**.

<br />

## Version web

L'application est aussi disponible en version web (PWA), deployee automatiquement a chaque push sur `main`. Le build web utilise un shim qui remplace les appels IPC Electron par des requetes HTTP vers le serveur Node.js.

```bash
npm run build:web
```

Les fichiers sont generes dans `dist-web/` et servis par le serveur Express integre.

<br />

## Deploiement Docker

Un Dockerfile multi-stage est fourni pour deployer le serveur web en production. Le premier stage compile le frontend, le second ne contient que les fichiers de production et le serveur Node.js.

Les deux domaines principaux sont `app.cursus.school` (application) et `admin.cursus.school` (administration). La configuration Nginx correspondante se trouve dans le dossier `config/`.

<br />

## Mise a jour automatique

La version desktop pour Windows integre electron-updater. Lorsqu'une nouvelle version est publiee sur GitHub Releases, l'application propose automatiquement le telechargement et l'installation de la mise a jour au demarrage.

<br />

## Stack technique

| Couche | Technologie |
|--------|------------|
| Desktop | Electron 29, context isolation, Node integration desactive cote renderer, auto-update via electron-updater |
| Frontend | Vue 3 (Composition API), TypeScript, Pinia, Vue Router |
| Base de donnees | SQLite via Better-SQLite3, schema versionne avec migrations |
| Build | electron-vite + Vite, packaging via electron-builder |
| Serveur web | Express, Socket.IO pour le temps reel, deploye derriere Nginx |
| Mobile | PWA avec barre de navigation inferieure, pull-to-refresh, swipe |
| Deploiement | Docker multi-stage, Nginx, domaines app.cursus.school et admin.cursus.school |
| Tests | Vitest, coverage v8, supertest |

<br />

## Licence

MIT. Voir le fichier [LICENSE](LICENSE) pour les details.

Projet developpe par [Rohan Fosse](https://github.com/rohanfosse)
