---
subject: L'essence de Cursus — vision, positionnement, proposition de valeur
type: brownfield
rounds: 8
ambiguity: 17%
created: 2026-03-28
---

# Specification : L'essence de Cursus

## Scores de clarte

| Dimension | Score | Poids | Contribution |
|-----------|-------|-------|-------------|
| Objectif | 0.9 | 40% | 0.360 |
| Contraintes | 0.85 | 30% | 0.255 |
| Criteres de succes | 0.7 | 30% | 0.210 |

## Objectif

Cursus existe pour **eliminer la friction cognitive des etudiants et enseignants** causee par la fragmentation des outils (5-8 apps pour un seul cours). L'etudiant ouvre UNE app le matin et a tout : messages, devoirs, notes, documents.

## Formulation cristalline

> **Cursus est un outil sur-mesure pour la realite pedagogique d'une promotion, qui centralise chat, devoirs et documents dans un seul espace pour supprimer la charge mentale de la fragmentation multi-outils.**

## Coeur fonctionnel (non-negociable)

1. **Chat** — communiquer avec sa promo en temps reel
2. **Devoirs** — savoir quoi rendre, soumettre, etre note
3. **Documents** — retrouver toutes les ressources de cours
4. **Dashboard** — voir d'un coup d'oeil ou on en est

## Enrichissement (sacrificable pour le pilote)

- Kanban projet
- Timeline / frise chronologique
- REX (retour d'experience)
- Quiz live
- Signature PDF

## Proposition de valeur unique

Ce qui differencie Cursus de Discord + Google Classroom : **l'experience sur-mesure**. Cursus est construit autour de la realite pedagogique specifique (types de devoirs CESI, notation par rubrique, suivi de promo), pas comme un outil generique adapte a l'education.

## Contraintes clarifiees

- **Echelle reelle** : 1 enseignant + 30 etudiants. Les 400k etudiants de la VISION.md sont un horizon lointain, pas un objectif.
- **Coexistence** : Cursus seul. Pour les cours de Rohan, rien d'autre a cote. Pas de Teams, pas de Moodle en backup.
- **Remplacement Moodle** : PAS un objectif en soi. Si Moodle reste allume pour d'autres cours, ce n'est pas un echec.
- **60% du code est de l'enrichissement** : le coeur (chat + devoirs + docs + dashboard) represente ~40% des features. Le reste est du bonus.

## Non-objectifs (hors scope de la vision)

- Devenir "le Slack de l'education" — pas l'ambition immediate
- Remplacer Moodle institutionnellement — pas le combat
- Atteindre 400k etudiants — horizon lointain, pas un objectif
- Feature parity avec Teams/Moodle/Kahoot — le sur-mesure prime

## Criteres de succes

Le succes n'est PAS mesure en heures gagnees mais en **frustration eliminee** :

- [ ] **Zero "j'ai pas vu"** : les annonces sont lues, les deadlines connues
- [ ] **Zero "c'est ou ?"** : l'etudiant ne cherche jamais entre 2 outils
- [ ] **Zero relance inutile** : l'enseignant voit qui a vu quoi sans demander
- [ ] **App belle et fiable** : zero crash, UX fluide, design coherent — fierte du produit
- [ ] **Communication amelioree** : les questions sont posees dans le bon canal, les reponses sont trouvees

## Hypotheses exposees et resolues

| Hypothese | Challenge | Resolution |
|-----------|-----------|-----------|
| "Cursus vise 400k etudiants" | L'ambition ne correspond pas aux moyens | Echelle reelle = 30 etudiants, le reste est un horizon |
| "Cursus remplace Moodle" | Le remplacement n'est pas l'objectif | Cursus coexiste ou remplace selon le contexte, la valeur est dans la centralisation |
| "Toutes les features sont necessaires" | 8 domaines c'est beaucoup pour 30 etudiants | 4 domaines coeur (chat + devoirs + docs + dashboard), 5 sacrificables |
| "Le gain est mesurable en heures" | C'est plus subtil que du temps | Le vrai gain c'est la reduction de friction cognitive et de frustration |
| "Discord + Classroom suffirait" | Moins cher et plus connu | Non : l'experience sur-mesure (types de devoirs, notation, suivi promo) est irreproductible |
| "Cursus doit coexister avec Teams" | C'est l'approche pragmatique | Non : pour SES cours, Cursus seul. La coexistence dilue la valeur |

## Implications pour le developpement

### Ce que cette vision change

1. **Stabilite > Features** : avec 4 domaines coeur, l'effort doit aller dans la fiabilite (zero crash) et l'UX (fluide, coherente), pas dans de nouvelles fonctionnalites.

2. **Les features secondaires peuvent etre desactivees** : envisager un systeme de modules activables/desactivables. Pour le pilote, ne livrer que le coeur.

3. **Le dashboard est un coeur** : il a ete garde quand les quiz et le kanban ont ete coupes. Le dashboard est la vue "ou j'en suis", pas juste un ecran d'accueil.

4. **La mesure de succes est qualitative** : pas de KPI numeriques simples. Le succes se mesure par l'absence de friction ("j'ai pas vu" disparait).

5. **L'echelle 30 etudiants simplifie tout** : pas besoin de scalabilite, pas de multi-tenant, pas de CDN. SQLite + une machine suffit.

## Transcription

<details><summary>Voir les Q&R (8 rounds)</summary>

**Round 1 — Objectif** : Cursus existe pour reduire la friction etudiante. Le probleme c'est la fragmentation multi-outils, pas les outils eux-memes.

**Round 2 — Objectif** : Le coeur qui fait revenir les etudiants = chat + devoirs + documents. Le reste est de l'enrichissement.

**Round 3 — Contraintes** : L'echelle reelle c'est "ma promo, point" — 30 etudiants. Les 400k de la VISION.md sont un horizon lointain.

**Round 4 — Contradicteur** : Ce qui distingue Cursus de Discord + Classroom = l'experience sur-mesure. Construit pour SA realite pedagogique, pas un outil generique adapte.

**Round 5 — Criteres de succes** : Triple critere — temps gagne, communication amelioree, fierte du produit. Le remplacement de Moodle n'est PAS un objectif.

**Round 6 — Simplificateur** : 5 features sur 8 sacrificables (kanban, timeline, REX, quiz live, signature PDF). Le coeur = chat + devoirs + docs + dashboard.

**Round 7 — Criteres de succes** : Le gain n'est pas mesurable en heures. C'est la frustration cognitive qui doit disparaitre : "j'ai pas vu", "c'est ou ?", relances inutiles.

**Round 8 — Contraintes** : Cursus seul pour ses cours. Rien d'autre a cote. La coexistence avec Teams/Moodle dilue la valeur.

</details>
