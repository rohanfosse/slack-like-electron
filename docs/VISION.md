# Cursus : Vision Produit

## Le probleme

Dans l'enseignement superieur, les etudiants et enseignants naviguent quotidiennement entre 5 a 8 outils differents : Moodle pour les cours, Teams pour la visio, WhatsApp pour les groupes informels, un Drive pour les documents, les mails pour les annonces officielles, parfois Wooclap pour les quiz. Chaque outil couvre un besoin specifique mais aucun ne couvre le quotidien complet d'une promotion.

**La consequence n'est pas une perte de temps. C'est une charge mentale permanente :**
- "J'ai pas vu" : les annonces se perdent entre les canaux
- "C'est ou ?" : l'etudiant ne sait pas quel outil ouvrir
- "Il a rendu ?" : l'enseignant doit croiser 3 plateformes pour repondre
- Les deadlines se perdent, les relances s'accumulent, la frustration monte

Le probleme n'est pas que les outils sont mauvais. C'est qu'ils sont trop nombreux et ne se parlent pas.

## La solution

**Cursus est un outil sur-mesure pour la realite pedagogique d'une promotion.** Il centralise chat, devoirs et documents dans un seul espace pour supprimer la charge mentale de la fragmentation.

L'etudiant ouvre Cursus le matin et n'a jamais a se demander "c'est ou ?".

## Principes fondateurs

- **Un seul endroit** : l'etudiant ouvre Cursus et a tout ce dont il a besoin
- **Sur-mesure** : construit pour la realite pedagogique (types de devoirs, notation par rubrique, suivi de promo), pas generique
- **Temps reel** : les notifications arrivent instantanement, pas de page a rafraichir
- **Simplicite** : chaque fonctionnalite est a 1 ou 2 clics maximum

---

## Coeur fonctionnel

Ces quatre domaines sont le coeur de Cursus. Ils doivent etre impeccables.

### 1. Chat
Communiquer avec sa promo en temps reel. Canaux par promotion, messages directs, mentions, reactions, epinglage. Slash commands pour les actions rapides.

### 2. Devoirs
Savoir quoi rendre, soumettre, etre note. 5 types de devoirs (livrable, soutenance, CCTL, etude de cas, memoire), notation par lettres et rubriques, deadlines, feedback individuel.

### 3. Documents
Retrouver toutes les ressources de cours. Upload, categorisation, viewers integres (PDF, Word, Excel), recherche, liaison avec les devoirs.

### 4. Dashboard
Voir d'un coup d'oeil ou on en est. Vue personnalisee avec les priorites du jour, les deadlines proches, les dernieres notes, la progression.

## Enrichissement

Ces fonctionnalites enrichissent l'experience mais ne sont pas le coeur. Elles peuvent etre desactivees ou reportees.

- **Quiz live** : QCM, sondages, nuages de mots en temps reel
- **Kanban projet** : suivi visuel des projets par colonnes
- **Timeline** : frise chronologique des devoirs
- **REX** : retours d'experience interactifs
- **Signature PDF** : circuit de signature pour les conventions
- **Mode hors-ligne** : consultation des donnees sans connexion

---

## Personas

### Rohan, Pilote de promotion

**Profil**
- Enseignant en informatique au CESI
- Responsable d'une promotion de 30 etudiants
- 10-20h par semaine sur le projet Cursus

**Sa frustration**
La fragmentation. Passer d'un outil a l'autre pour savoir si l'annonce a ete lue, si le devoir a ete rendu, si l'etudiant a une question. La charge mentale de jongler entre les plateformes quand il veut juste enseigner.

**Ce que Cursus lui apporte**
- Un dashboard qui montre en un coup d'oeil l'etat de sa promotion
- Zero relance inutile : il voit qui a vu quoi
- Les devoirs, le chat et les docs sont au meme endroit
- La fierte d'un produit qu'il a construit pour sa realite

### Emma, Etudiante en 2eme annee

**Profil**
- 20 ans, etudiante en informatique au CESI
- Travaille sur 5 projets en parallele
- Utilise principalement son telephone

**Sa frustration**
Ne jamais savoir ou regarder. "C'etait sur Moodle ou Teams ?" "Le devoir c'est par mail ou sur la plateforme ?" Perdre un rendu parce qu'elle l'a envoye au mauvais endroit.

**Ce que Cursus lui apporte**
- Un seul endroit pour tout : devoirs, notes, messages, documents
- Plus jamais "j'ai pas vu" : tout est la, avec des notifications
- Les depots se font en 2 clics depuis la fiche du devoir
- Les notes arrivent en notification instantanee

---

## Proposition de valeur

### Pour les etudiants
> "Un seul endroit pour tout suivre : devoirs, notes, messages, documents. Plus jamais 'c'est ou ?'."

### Pour les enseignants
> "Gerez votre promotion sans charge mentale. Tout est au meme endroit, plus besoin de jongler entre 5 outils."

### Ce qui differencie Cursus
Ce n'est pas "Slack + Moodle combines". C'est un outil construit **pour** la realite pedagogique : types de devoirs specifiques (livrables, soutenances, CCTL), notation par rubrique, suivi de promo, slash commands pedagogiques. Discord + Google Classroom ne peuvent pas offrir ca.

---

## Analyse concurrentielle

| Critere | Cursus | Moodle | Google Classroom | Teams Edu | Discord |
|---------|--------|--------|-----------------|-----------|---------|
| **Messagerie temps reel** | Oui (Socket.IO) | Non (forum) | Non (flux) | Oui | Oui |
| **Gestion des devoirs** | Oui (5 types) | Oui | Oui | Basique | Non |
| **Notation structuree** | A-F + rubriques | Bareme | Basique | Non | Non |
| **Quiz en direct** | Oui (integre) | Plugin | Non | Non | Non |
| **Open source** | Oui (MIT) | Oui (GPL) | Non | Non | Non |
| **Hebergement local** | Oui (SQLite) | Oui | Non (cloud) | Non (cloud) | Non (cloud) |
| **Sur-mesure educatif** | Oui | Generique | Generique | Generique | Non |

---

## Criteres de succes

Le succes de Cursus ne se mesure pas en nombre d'utilisateurs ou en heures gagnees. Il se mesure en **frustration eliminee** :

- **Zero "j'ai pas vu"** : les annonces sont lues, les deadlines sont connues
- **Zero "c'est ou ?"** : l'etudiant ne cherche jamais entre 2 outils
- **Zero relance inutile** : l'enseignant voit qui a vu quoi sans demander
- **App fiable et fluide** : zero crash, UX coherente, design professionnel
- **Communication amelioree** : les questions sont posees dans le bon canal

---

## Echelle et ambition

### Realite actuelle
- 1 enseignant (Rohan) + 30 etudiants + 0-2 intervenants
- Objectif septembre 2026 : deployer dans sa promo pour un usage quotidien
- SQLite, une seule machine, zero dependance cloud

### Horizon (non-prioritaire)
- Multi-campus CESI si le pilote reussit
- Open source pour que d'autres enseignants l'adoptent
- Hebergement manage pour les etablissements qui le souhaitent

L'ambition viendra apres la preuve. Le pilote d'abord.

---

## Roadmap produit

### Phase actuelle (v2.x) : Consolider le coeur

- Stabiliser les 4 domaines coeur (chat, devoirs, documents, dashboard)
- Augmenter la couverture de tests
- Implementer le systeme de roles et permissions (admin, enseignant, TA, etudiant)
- Creer l'entite Projet comme unite organisationnelle
- Ameliorer l'onboarding (wizard premier lancement)
- Auto-update fiable

### Phase suivante (v3.0) : Collaboration

- Fils de discussion (threads) dans les canaux
- Agenda partage avec synchronisation iCalendar
- Version web en complement du desktop
- Integration videoconference (WebRTC ou embed Jitsi)

### Vision long terme (v4.0) : Intelligence

- Detection proactive des etudiants en difficulte
- Suggestions de feedback assistees par IA
- API publique pour integrations LMS (SCORM, LTI)

---

## Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| **Bug en production** devant 30 etudiants | Critique | Tests rigoureux, auto-update, wizard d'onboarding |
| **Friction d'installation** (machines personnelles) | Eleve | App stable + onboarding guide, version web a terme |
| **Adoption insuffisante** | Eleve | Metriques legeres + alertes inactivite, feedback rapide |
| **Scope trop large** (40+ features) | Moyen | Coeur de 4 domaines, enrichissement desactivable |
| **Developpeur unique** | Moyen | Architecture simple, SQLite, zero dependance externe lourde |

---

*Document mis a jour le 28 mars 2026, apres deep interview de clarification*
*Auteur : Rohan Fosse*
