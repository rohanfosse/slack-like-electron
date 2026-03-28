---
subject: Strategie de deploiement et adoption utilisateur
type: brownfield
rounds: 8
ambiguity: 20%
created: 2026-03-28
---

# Specification : Strategie de deploiement et adoption utilisateur

## Scores de clarte

| Dimension | Score | Poids | Contribution |
|-----------|-------|-------|-------------|
| Objectif | 0.9 | 35% | 0.315 |
| Contraintes | 0.7 | 25% | 0.175 |
| Criteres de succes | 0.8 | 25% | 0.200 |
| Contexte brownfield | 0.7 | 15% | 0.105 |

## Objectif

Deployer Cursus dans une promo CESI de ~30 etudiants en septembre 2026, avec un objectif de **20+ etudiants actifs par semaine** (3+ connexions/semaine) et **zero retour a Moodle** pour les cours concernes. L'adoption se mesure par l'usage quotidien actif (DAU) et l'engagement pedagogique (quiz, soumissions de devoirs, ponctualite).

## Contraintes

- **Risque reputationnel** : un crash en cours devant 30 etudiants detruit la confiance definitivement. La stabilite est existentielle.
- **Friction d'installation** : pas de MDM, machines personnelles, chaque etudiant doit volontairement telecharger et installer. Aucun deploiement force possible.
- **Pas de contrainte institutionnelle bloquante** : CESI n'impose pas Teams/Moodle comme outils exclusifs, marge de manoeuvre disponible.
- **Budget temps** : 10-20h/semaine de dev, un seul developpeur. Chaque feature doit etre choisie avec soin.

## Non-objectifs (hors scope MVP septembre 2026)

- Version web (envisagee a terme, mais PAS dans le MVP — priorite a la stabilite desktop)
- Migration automatisee depuis Moodle/Canvas
- Analytics avancees / dashboard Big Brother
- Deploiement multi-etablissements

## Criteres d'acceptation

- [ ] **20+ etudiants actifs/semaine** apres 1 mois de deploiement (mesurable via metriques legeres)
- [ ] **Zero fallback Moodle** : aucun moment ou l'enseignant doit dire "allez sur Moodle pour X"
- [ ] **Wizard d'onboarding bloquant** en 3-5 etapes au premier lancement (photo, canaux, decouverte features)
- [ ] **Alertes d'inactivite** : notification admin si un etudiant ne s'est pas connecte depuis 7 jours
- [ ] **Zero crash bloquant** pendant le premier mois (aucun bug empechant un etudiant de travailler > 30 min)
- [ ] **Boucle de feedback reactive** : sondage rapide via le systeme existant + capacite a deployer un patch dans la semaine

## Hypotheses exposees et resolues

| Hypothese | Challenge | Resolution |
|-----------|-----------|-----------|
| "80% adoption = installe l'app" | L'installation n'est pas l'adoption | Adoption = DAU + engagement pedagogique mesurable |
| "Je verrai en cours qui utilise" | Certains sont en distanciel/silencieux | Metriques legeres + alertes d'inactivite (pas de dashboard complet) |
| "Le web fallback resout la friction" | Deux portes d'entree = double maintenance | MVP = desktop stable uniquement. Web reporte post-pilote |
| "L'app est intuitive, pas besoin d'onboarding" | Le bandeau actuel disparait en 1 clic | Wizard bloquant 3-5 etapes obligatoire au premier lancement |
| "Si ca marche pas, on abandonne" | 15 actifs sur 30 n'est pas un echec total | Feedback collectif + patch dans la semaine. Iteration, pas abandon |

## Contexte technique

### Code existant exploitable
- **Engagement scoring** : `server/db/models/engagement.js` — calcule deja messages, soumissions, activite. Reutilisable pour les metriques d'adoption
- **Feedback system** : bouton flottant + dashboard admin (`server/routes/admin/feedback.js`) — pret pour les sondages post-lancement
- **Notification settings** : 6 toggles granulaires + DND (`useSettingsPreferences.ts`) — fondation pour les alertes d'inactivite
- **Import CSV** : `ImportStudentsModal.vue` — creation de comptes en masse deja fonctionnelle
- **Installer wizard** : pattern existant dans les commits recents — reutilisable pour l'onboarding utilisateur

### A construire
1. **Wizard d'onboarding utilisateur** (3-5 etapes, bloquant au premier lancement)
2. **Metriques legeres d'adoption** (DAU/WAU, derniere connexion par etudiant)
3. **Alertes d'inactivite admin** (notification si etudiant absent > 7 jours)
4. **Stabilisation + tests** (priorite #1 avant toute nouvelle feature)

### Priorite d'implementation
1. Stabilite & tests (bloquant)
2. Wizard d'onboarding (critique pour l'adoption jour 1)
3. Metriques legeres + alertes (necessaire des la semaine 2)
4. Boucle feedback rapide (le systeme existe, a affiner)

## Transcription

<details><summary>Voir les Q&R</summary>

**Round 1 — Objectif** : "80% adoption" = usage quotidien actif (DAU 24+/30) + engagement pedagogique mesurable (quiz, devoirs, ponctualite). Pas juste "installe".

**Round 2 — Contraintes** : Deux murs principaux — risque reputationnel (crash = confiance perdue) et friction d'installation (machines personnelles, pas de MDM). Pas de blocage institutionnel.

**Round 3 — Criteres de succes** : Go/no-go a 1 mois = 20+ actifs/semaine + zero retour a Moodle. Tolerance aux imperfections techniques tant que l'usage global tient.

**Round 4 — Contradicteur / Contexte brownfield** : Metriques legeres + alertes ciblees plutot que dashboard complet. Intervention chirurgicale sur les decrocheurs.

**Round 5 — Contraintes** : Version web en fallback pour eliminer la barriere d'installation. Reduire la friction a zero.

**Round 6 — Simplificateur / Criteres** : Recentrage MVP = app stable + onboarding guide. Le web est reporte. Stabilite > onboarding > web.

**Round 7 — Contexte brownfield** : Wizard bloquant 3-5 etapes au premier lancement. L'etudiant configure son profil, rejoint ses canaux, decouvre les features avant d'acceder a l'app.

**Round 8 — Objectif / Plan B** : Si adoption stagne, feedback collectif rapide via le systeme existant + patch deploye dans la semaine. Iteration, pas abandon.

</details>
