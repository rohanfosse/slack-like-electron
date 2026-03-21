# Cursus — Plateforme de Communication pour l'Enseignement

Application de bureau collaborative conçue pour le milieu éducatif. Elle réunit messagerie instantanée, gestion des travaux et partage de ressources dans un seul espace, pensé pour les étudiants et les équipes pédagogiques.

---

## Pourquoi Cursus ?

Dans la plupart des formations, les échanges passent par des outils dispersés : mails, groupes WhatsApp, plateformes LMS lourdes, dossiers partagés. Le résultat : des informations perdues, des deadlines oubliées, et un temps précieux gaspillé à naviguer entre les outils.

Cursus répond à ce problème en proposant un environnement unique, structuré autour de trois principes :

* **Réduire la charge cognitive** — Une interface épurée où chaque fonctionnalité est accessible en un ou deux clics. Pas de menus imbriqués, pas de pages à chercher.
* **Sécuriser le droit à l'erreur** — Les étudiants peuvent remplacer un rendu avant l'échéance, sans intervention de l'enseignant. Le stress du "mauvais fichier envoyé" disparaît.
* **Libérer du temps pour l'accompagnement** — Grilles d'évaluation par critères, notation rapide par lettres et export CSV : l'enseignant passe moins de temps sur la logistique et plus sur les retours qualitatifs.

---

## Fonctionnalités

### Messagerie

Canaux publics, canaux d'annonce (lecture seule pour les étudiants) et messages privés. Les messages supportent les réponses avec citation, les réactions par emoji, l'épinglage, les mentions (`@nom`, `@everyone`) et la recherche plein texte. Les notifications de bureau signalent les messages importants.

### Travaux & Évaluation

L'enseignant crée des devoirs (livrable, soutenance, CCTL, étude de cas, mémoire...) avec date limite et mode brouillon. Les dépôts sont automatiquement bloqués après l'échéance. Chaque devoir peut avoir sa propre grille d'évaluation multicritères, et la notation par lettres (A à F) se fait directement depuis la liste des rendus. Les notes sont exportables en CSV.

### Documents & Ressources

Fichiers et liens attachés à un canal ou un projet. La visionneuse intégrée ouvre les PDF, images, documents Word et tableurs sans quitter l'application.

### Promotions & Groupes

Chaque promotion a sa couleur et ses canaux. Les groupes de travail disposent de canaux privés et de devoirs ciblés. L'import en masse des étudiants se fait par CSV.

### Tableau de bord enseignant

Vue d'ensemble de l'avancement des dépôts par promotion, planificateur visuel des jalons et rappels automatiques de deadline la veille de l'échéance.

---

## Démarrage rapide

```bash
# Cloner le dépôt
git clone <url-du-repo>
cd slack-like-electron

# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev

# Construire l'exécutable
npm run build
```

La base de données est créée automatiquement au premier lancement. Pour peupler l'application avec des données de démonstration, utiliser le bouton **Réinitialiser et peupler** dans le panneau d'administration.

---

## Pistes d'évolution

* **Fils de discussion** — Répondre dans un fil dédié sans polluer le canal principal
* **Recherche globale** — Recherche plein texte sur l'ensemble des canaux avec filtres par auteur, date et canal
* **Centre de notifications** — Historique centralisé des mentions, réponses et rappels de deadline
* **Accusés de lecture des annonces** — Confirmation de lecture obligatoire, avec suivi côté enseignant
* **Sondages dans les canaux** — Votes rapides à choix unique ou multiple
* **Vue calendrier** — Calendrier mensuel des deadlines et soutenances, filtrable par promotion
* **Portfolio étudiant** — Récapitulatif par étudiant de tous ses dépôts, notes et retours sur le semestre
* **Évaluation par les pairs** — Permettre aux étudiants d'évaluer le travail d'autres groupes
* **Messages vocaux** — Enregistrement audio court pour les retours enseignant ou les questions étudiant
