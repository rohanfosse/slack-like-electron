# Cursus : Business Model Canvas

## 1. Segments de clients

### Primaire
- **Ecoles d'ingenieurs** (CTI) avec formations par projet et alternance
- Focus initial : reseau CESI (26 campus en France)

### Secondaire
- **BTS et IUT** avec projets en groupe et suivi regulier
- **Universites** avec formations professionnalisantes

### Tertiaire (long terme)
- **Centres de formation continue** et organismes de certification
- **Entreprises** pour la formation interne

## 2. Proposition de valeur

**Pour les etudiants** : un espace unique pour devoirs, messages et notes, accessible sur mobile.

**Pour les enseignants** : gestion de promotion en un coup d'oeil, quiz en direct, rappels automatiques.

**Pour les DSI** : open source, hebergeable en interne, conforme RGPD, remplace 5 abonnements SaaS.

## 3. Canaux de distribution

- **Direct** : site web cursus.school, GitHub (open source)
- **Interne CESI** : deploiement pilote campus par campus
- **Conferences** : salons EdTech (Educatice, Bett), meetups developpeurs
- **Bouche a oreille** : etudiants qui changent de campus/ecole

## 4. Relations clients

- **Community** : GitHub Issues, Discord communautaire, documentation en ligne
- **Campus** : onboarding assiste (1h de formation), support email, webinaires trimestriels
- **Enterprise** : chef de projet dedie, formation sur site, SLA contractuel

## 5. Sources de revenus

| Source | Description | Estimation |
|--------|-------------|-----------|
| Hebergement manage | app.cursus.school pour chaque campus | 2 EUR/etudiant/an |
| Support premium | Assistance technique prioritaire | 500 EUR/campus/an |
| Formation | Session de formation enseignants (1 journee) | 800 EUR/session |
| Personnalisation | Branding, integration SSO, connecteurs LMS | Sur devis |

## 6. Ressources cles

- **Technique** : codebase Vue 3 + Electron, infrastructure Docker, CI/CD GitHub Actions
- **Humaine** : developpeur principal (Rohan Fosse)
- **Relationnelle** : acces direct au reseau CESI (etudiants et enseignants)
- **Propriete intellectuelle** : marque Cursus, domaine cursus.school

## 7. Activites cles

- Developpement produit (features, bug fixes, performance)
- Deploiement et maintenance des instances campus
- Support utilisateur (etudiants + enseignants)
- Acquisition de nouveaux campus (demos, onboarding)
- Veille concurrentielle et pedagogique

## 8. Partenaires cles

- **CESI** : premier partenaire pilote, retour terrain direct
- **Hebergeur** : Hostinger/OVH pour l'infrastructure serveur
- **Open source** : communaute de contributeurs GitHub
- **EdTech** : incubateurs (Station F, CESI Lineact) pour l'accompagnement

## 9. Structure de couts

| Poste | Mensuel | Annuel |
|-------|---------|--------|
| Hebergement serveur (VPS) | 15 EUR | 180 EUR |
| Domaines (cursus.school) | 3 EUR | 36 EUR |
| Certificats SSL | Gratuit (Let's Encrypt) | 0 EUR |
| CI/CD (GitHub Actions) | Gratuit (open source) | 0 EUR |
| Marketing (site web) | 0 EUR | 0 EUR |
| **Total actuel** | **18 EUR** | **216 EUR** |

Le cout de fonctionnement est extremement faible grace a l'hebergement local (SQLite, pas de BDD cloud) et aux outils gratuits (GitHub, Let's Encrypt, Docker).

---

## Metriques de validation (pilote CESI Bordeaux)

| Metrique | Objectif | Statut |
|----------|----------|--------|
| Etudiants actifs | 45 | En cours |
| Enseignants utilisant la plateforme | 5 | En cours |
| Messages envoyes par semaine | 100+ | A mesurer |
| Rendus deposes via Cursus | 80%+ | A mesurer |
| Satisfaction etudiant (NPS) | > 30 | A mesurer |

---

*Derniere mise a jour : 22 mars 2026*
