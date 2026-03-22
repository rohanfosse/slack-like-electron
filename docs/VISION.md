# Cursus : Vision Produit

## Le probleme

Dans l'enseignement superieur, les etudiants et enseignants naviguent quotidiennement entre 5 a 8 outils differents : Moodle pour les cours, Teams pour la visio, WhatsApp pour les groupes informels, un Drive pour les documents, les mails pour les annonces officielles, parfois Wooclap pour les quiz. Chaque outil couvre un besoin specifique mais aucun ne couvre le quotidien complet d'une promotion.

**Consequences directes :**
- Les annonces sont ratees parce qu'elles sont sur le mauvais canal
- Les deadlines se perdent entre trois plateformes
- Les enseignants passent plus de temps a relancer qu'a accompagner
- Les etudiants ne savent pas ou deposer leur rendu
- Aucune vue unifiee de la progression d'une promotion

## La solution

**Cursus centralise tout dans un seul espace** : messagerie, devoirs, quiz en direct, documents et suivi de progression. L'application est pensee pour le quotidien d'une promotion, pas pour un usage ponctuel.

Principes fondateurs :
- **Un seul endroit** : l'etudiant ouvre Cursus le matin et n'en sort pas de la journee
- **Temps reel** : pas de page a rafraichir, les notifications arrivent instantanement
- **Mobile first** : accessible depuis le telephone sans installation (PWA)
- **Simplicite** : chaque fonctionnalite est a 1 ou 2 clics maximum

---

## Personas

### Persona 1 : Rohan, Pilote de promotion

**Profil**
- 35 ans, enseignant-chercheur en informatique
- Responsable de 2 promotions (45 etudiants au total)
- Donne 6h de cours par semaine, le reste est du suivi et de l'evaluation

**Frustrations actuelles**
- Passe 2h par semaine a relancer les etudiants sur les deadlines
- Doit jongler entre Moodle (rendus), Teams (visio), et les mails (annonces)
- N'a pas de vision claire de qui a rendu quoi sans ouvrir 3 onglets
- Les quiz en cours necessitent un outil supplementaire (Wooclap, Kahoot)

**Ce que Cursus lui apporte**
- Un dashboard qui montre en un coup d'oeil l'etat de sa promotion
- Les rappels se font en 1 clic depuis la fiche du devoir
- Les quiz se lancent directement dans l'application, sans changer d'outil
- L'export CSV des notes se fait en fin de semestre sans recopier

**Scenario type**
Rohan ouvre Cursus le lundi matin. Son dashboard lui montre que 3 rendus sont a noter et qu'un CCTL a lieu mercredi. Il lance un rappel automatique pour le livrable de vendredi. En cours, il demarre un quiz QCM directement depuis l'onglet Live. Les resultats s'affichent en temps reel et il les commente avec la classe.

---

### Persona 2 : Emma, Etudiante en 2eme annee

**Profil**
- 20 ans, etudiante en informatique au CESI
- Travaille sur 5 projets en parallele dans 3 matieres differentes
- Utilise principalement son telephone pour suivre ses cours

**Frustrations actuelles**
- Ne sait jamais quel devoir est urgent parce que les infos sont dispersees
- A deja perdu un rendu parce qu'elle l'a envoye par mail au lieu de Moodle
- Les groupes WhatsApp de promo sont bruyants et les annonces importantes se noient
- Decouvre ses notes par hasard, parfois plusieurs semaines apres

**Ce que Cursus lui apporte**
- Son dashboard personnalise lui montre ses priorites du jour
- Les depots se font en 2 clics depuis la fiche du devoir
- Les notes arrivent en notification instantanee
- Le mode Focus masque le bruit quand elle revise

**Scenario type**
Emma ouvre Cursus sur son telephone pendant la pause. Son dashboard affiche "CCTL Reseaux dans 2 jours" en orange. Elle clique et voit les consignes et les ressources du prof. Elle repond au quiz de revision lance par le prof directement depuis l'app. Apres le CCTL, elle recoit sa note en notification push le lendemain.

---

### Persona 3 : Jean-Marc, Directeur de campus

**Profil**
- 50 ans, directeur du campus CESI de Bordeaux
- Supervise 15 promotions et 30 enseignants
- A besoin de reporting et de conformite RGPD

**Frustrations actuelles**
- N'a pas de visibilite sur l'engagement des etudiants par promotion
- Les outils utilises ne sont pas conformes aux exigences RGPD de l'etablissement
- Chaque enseignant utilise ses propres outils, pas de standard

**Ce que Cursus lui apporte**
- Console d'administration avec metriques par promotion
- Donnees hebergees localement (SQLite, pas de cloud tiers)
- Standardisation des outils pour tous les enseignants du campus
- Export des donnees conforme RGPD

---

## Analyse concurrentielle

| Critere | Cursus | Moodle | Google Classroom | Teams Edu | Discord |
|---------|--------|--------|-----------------|-----------|---------|
| **Messagerie temps reel** | Oui (Socket.IO) | Non (forum) | Non (flux) | Oui | Oui |
| **Gestion des devoirs** | Oui | Oui | Oui | Basique | Non |
| **Quiz en direct** | Oui (integre) | Plugin | Non | Non | Non |
| **Notation structuree** | A-F + grilles | Bareme | Basique | Non | Non |
| **Application desktop** | Oui (Electron) | Non | Non | Oui | Oui |
| **PWA mobile** | Oui | Non | Oui | Oui | Non |
| **Open source** | Oui (MIT) | Oui (GPL) | Non | Non | Non |
| **Hebergement local** | Oui (SQLite) | Oui | Non (cloud) | Non (cloud) | Non (cloud) |
| **Temps de setup** | 5 minutes | 2-4 heures | 15 minutes | 30 minutes | 5 minutes |
| **Courbe d'apprentissage** | Faible | Elevee | Faible | Moyenne | Faible |

### Avantage competitif principal

Cursus est le seul outil qui combine **messagerie en temps reel + gestion des devoirs + quiz en direct** dans une seule application, avec un hebergement local (pas de dependance cloud) et une installation en 5 minutes.

Moodle couvre les devoirs mais pas la messagerie. Discord couvre la messagerie mais pas les devoirs. Wooclap couvre les quiz mais rien d'autre. Cursus couvre les trois.

---

## Proposition de valeur

### Pour les etudiants
> "Un seul endroit pour tout suivre : devoirs, notes, messages, quiz. Plus rien a chercher entre 5 applications."

### Pour les enseignants
> "Gerez votre promotion en un coup d'oeil. Creez des devoirs, lancez des quiz et suivez la progression sans changer d'outil."

### Pour les etablissements
> "Un outil open source, hebergeable en interne, conforme RGPD, qui remplace 5 abonnements SaaS."

---

## Modele economique (pistes)

### Option 1 : Open Source + Hebergement managee

Le code reste open source (MIT). Les etablissements peuvent l'heberger eux-memes gratuitement. Cursus propose un service d'hebergement manage avec support pour les etablissements qui ne veulent pas gerer l'infrastructure.

| Offre | Prix | Contenu |
|-------|------|---------|
| **Community** | Gratuit | Code source, auto-hebergement, communaute GitHub |
| **Campus** | 2 EUR/etudiant/an | Hebergement manage, SSL, backups quotidiens, support email |
| **Enterprise** | Sur devis | Multi-campus, SSO/LDAP, SLA 99.9%, support prioritaire |

### Option 2 : Freemium

Cursus est gratuit jusqu'a 50 etudiants par campus. Au-dela, tarification par palier.

| Palier | Etudiants | Prix |
|--------|-----------|------|
| Starter | 1-50 | Gratuit |
| Standard | 51-500 | 500 EUR/an |
| Premium | 500+ | 1500 EUR/an |

### Option 3 : Licence etablissement

Vente de licences annuelles par etablissement, avec accompagnement a la mise en place.

---

## Metriques cles (KPIs)

### Adoption
- Nombre d'etablissements utilisant Cursus
- Nombre d'etudiants actifs par semaine (DAU/WAU)
- Taux de retention a 30 jours

### Engagement
- Messages envoyes par jour par utilisateur
- Rendus deposes dans les temps vs en retard
- Taux de participation aux quiz en direct
- Temps moyen passe sur l'application par session

### Satisfaction
- NPS (Net Promoter Score) par role (etudiant, enseignant, admin)
- Taux de signalement de bugs
- Nombre de suggestions d'amelioration via le feedback integrre

---

## Roadmap produit

### Phase actuelle (v2.x) : Consolidation

- Stabiliser le design sur tous les themes
- Ameliorer les performances (lazy loading, optimisation des requetes)
- Augmenter la couverture de tests (composables, integration)
- Documenter l'API pour les integrations tierces

### Phase suivante (v3.0) : Collaboration

- Fils de discussion (threads) dans les canaux
- Co-edition de documents en temps reel
- Agenda partage avec synchronisation iCalendar
- Intégration videoconference (WebRTC ou embed Jitsi)

### Vision long terme (v4.0) : Intelligence

- Suggestions de feedback automatiques via IA (validation par l'enseignant)
- Detection proactive des etudiants en difficulte (modele de risque)
- Recommandations de ressources basees sur les lacunes identifiees
- API publique pour integrations LMS (SCORM, LTI)

---

## Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| **Resistance au changement** des enseignants | Elevee | Onboarding guide, formation 1h, migration assistee |
| **Securite des donnees** etudiantes | Critique | Hebergement local, chiffrement bcrypt, audit RGPD |
| **Scalabilite** SQLite | Moyen | Migration PostgreSQL prevue pour v3.0 si > 1000 users |
| **Concurrence** Moodle/Teams | Moyen | Differenciation par la simplicite et le temps reel |
| **Maintenance** open source | Faible | Communaute, documentation, CI/CD automatise |

---

## Cible de lancement

### Marche initial : CESI (pilote)

- 1 campus (Bordeaux)
- 2 promotions (CPIA2 + FISA A4)
- 45 etudiants + 5 enseignants
- Objectif : valider le produit en conditions reelles

### Extension court terme : Multi-campus CESI

- 5 campus CESI en France
- 500 a 1000 etudiants
- Objectif : standardiser l'outil au sein du reseau CESI

### Extension moyen terme : Autres etablissements

- Ecoles d'ingenieurs francaises (CTI)
- BTS et IUT (formations courtes avec projets)
- Objectif : 10 000 etudiants actifs

---

*Document mis a jour le 22 mars 2026*
*Auteur : Rohan Fosse*
