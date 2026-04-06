---
subject: Renommage Live Quiz → Spark + enrichissement (Vrai/Faux, Reponse courte)
type: brownfield
rounds: 10
ambiguity: 12.25%
created: 2026-04-06
---

# Specification : Renommage Live Quiz → Spark

## Scores de clarte

| Dimension | Score | Poids | Contribution |
|-----------|-------|-------|-------------|
| Objectif | 0.95 | 35% | 33.25% |
| Contraintes | 0.85 | 25% | 21.25% |
| Criteres de succes | 0.85 | 25% | 21.25% |
| Contexte | 0.80 | 15% | 12.00% |
| **Total** | | | **87.75% clarte** |

## Objectif

Renommer la feature "Live Quiz" en **"Spark"** (l'etincelle de comprehension) et refondre le copywriting, puis enrichir avec deux nouveaux types de questions. Approche en deux phases.

**Trilogie Cursus** : Cursus (le parcours) + Pulse (le pouls) + Spark (l'etincelle).

**Usage reel** : verification de comprehension en fin de cours, ambiance bienveillante. Pas un examen, pas une competition — un outil ludique et pedagogue.

## Phase 1 : Renommage + Repositionnement

### Scope
- Labels visibles uniquement : landing page, NavRail, Dashboard, messages, titres
- Code interne reste `live` partout (routes API `/api/live/*`, composants `*Live*.vue`, store `live.ts`, DB `live_*`)
- Refonte complete du copywriting (landing + app)
- Ton : **chaleureux + ludique** ("apprendre en s'amusant", pas "compete and win")

### Criteres d'acceptation Phase 1
- [ ] Landing : carte bento "Live Quiz" → "Spark" avec nouveau visuel/texte
- [ ] Landing : section feature #feat-live entierement reecrite
- [ ] Landing : "Live Quiz" retire de la navbar (accessible par scroll)
- [ ] App : NavRail etudiant affiche "Spark" avec icone `Zap` (eclair) au lieu de "Quiz" + `Radio`
- [ ] App : Dashboard enseignant onglet "Quiz" → "Spark" avec icone `Zap`
- [ ] App : tous les labels, titres, messages visibles disent "Spark" au lieu de "Quiz" / "Live Quiz"
- [ ] App : MobileNav label + icone mis a jour
- [ ] App : widget etudiant "Quiz en cours" → "Spark en cours"
- [ ] App : invite popup "vous invite a un quiz" → "vous invite a un Spark"
- [ ] Ton du copywriting : chaleureux + ludique, centre sur l'apprentissage, pas la competition
- [ ] Coherence : aucune mention visible de "Quiz" / "Live Quiz" ne subsiste cote utilisateur

## Phase 2 : Nouveaux types de questions

### Type 1 : Vrai/Faux
- Question avec deux boutons (Vrai / Faux)
- Ultra-rapide a creer pour l'enseignant (juste un titre + la bonne reponse)
- Scoring Kahoot identique aux QCM
- Timer configurable comme les autres types
- Type interne : `vrai_faux`

### Type 2 : Reponse courte
- L'etudiant tape une reponse textuelle courte
- L'enseignant definit une **liste de reponses acceptees** (ex: "O(n log n)", "n log n", "nlogn")
- **Match fuzzy** (Levenshtein distance 1-2) sur chaque reponse acceptee
- Insensible a la casse et aux accents
- Scoring Kahoot si la reponse matche
- Type interne : `reponse_courte`

### Criteres d'acceptation Phase 2
- [ ] ActivityForm : nouveau type "Vrai/Faux" avec UI simple (titre + toggle vrai/faux)
- [ ] ActivityForm : nouveau type "Reponse courte" avec UI (titre + liste de reponses acceptees, bouton ajouter/supprimer)
- [ ] StudentLiveView : UI Vrai/Faux (deux gros boutons colores)
- [ ] StudentLiveView : UI Reponse courte (input texte + bouton envoyer)
- [ ] Backend : support des deux types dans le scoring (match exact + fuzzy Levenshtein)
- [ ] Backend : normalisation reponses (lowercase, trim, suppression accents)
- [ ] Results : affichage adapte pour chaque nouveau type
- [ ] Tests unitaires et integration pour les deux types
- [ ] Landing + app : copywriting mis a jour pour mentionner les 5 types

## Contraintes

- Code interne reste `live` (routes, store, composants, DB, tests)
- Phase 1 livree et testee AVANT Phase 2
- Le Live Quiz actuel (QCM, sondage, nuage) ne doit pas etre casse
- Le scoring Kahoot existant reste identique
- Pas de mode asynchrone (hors scope)
- Icone app : `Zap` (Lucide) partout au lieu de `Radio`
- Landing : Spark retire de la navbar (accessible par scroll)

## Non-objectifs (hors scope)

- Mode asynchrone / homework
- Refactoring du code interne (live → spark)
- Fusion avec Pulse
- Nouveaux types au-dela de Vrai/Faux et Reponse courte
- Modification du systeme de scoring

## Hypotheses exposees et resolues

| Hypothese | Challenge | Resolution |
|-----------|-----------|-----------|
| Live Quiz doit etre fusionne avec Pulse | "Wooclap fait tout en un" | Non — les deux restent separes, usage different |
| Le nom Live Quiz est OK | "Pourquoi changer ?" | Pas assez "produit", generique, ne colle pas avec Cursus + Pulse |
| Spark est le bon nom | Alternatives : Arena, Clash, Rally, Declic, Lumen, Bloom, Flash | Spark — etincelle de comprehension, bienveillant, coherent trilogie latine |
| On fait tout d'un coup | "Renommage + features ensemble ?" | Non — Phase 1 renommage, Phase 2 features. Plus propre |
| Le ton doit etre identique a Pulse | "Meme copywriting ?" | Non — chaleureux + ludique (vs chaleureux + pedagogue pour Pulse) |
| Spark dans la navbar landing | "Visibilite ?" | Non — retire de la navbar, comme Pulse. Accessible par scroll |
| Match exact pour Reponse courte | "Trop strict ?" | Multi-reponses acceptees + fuzzy Levenshtein |

## Contexte technique

### Fichiers impactes Phase 1 (landing)
- `src/landing/index.html` — carte bento, section feature #feat-live, navbar (retirer lien)

### Fichiers impactes Phase 1 (app UI)
- `src/renderer/src/components/live/TeacherLiveView.vue` — labels enseignant, icone
- `src/renderer/src/components/live/StudentLiveView.vue` — labels etudiant, icone
- `src/renderer/src/components/live/QuizHistoryView.vue` — titre historique
- `src/renderer/src/components/live/QuizStatsView.vue` — titre stats
- `src/renderer/src/components/live/JoinCodeDisplay.vue` — labels
- `src/renderer/src/components/live/Leaderboard.vue` — titre
- `src/renderer/src/components/live/Podium.vue` — titre
- `src/renderer/src/components/dashboard/student-widgets/WidgetLive.vue` — "Quiz en cours" → "Spark en cours"
- `src/renderer/src/views/LiveView.vue` — label ErrorBoundary
- NavRail.vue — label + icone (Radio → Zap)
- MobileNav.vue — label + icone
- DashboardTeacher.vue — onglet label + icone
- App.vue — invite popup message

### Fichiers impactes Phase 2 (features)
- `src/renderer/src/components/live/ActivityForm.vue` — nouveaux types
- `src/renderer/src/components/live/StudentLiveView.vue` — UI vrai/faux + reponse courte
- `server/routes/live.js` — validation + scoring nouveaux types
- `server/db/models/live.js` — support DB
- Tests backend et frontend

### Fichiers NON impactes
- `server/routes/live.js` routes API restent `/api/live/*`
- `server/db/models/live.js` — tables DB restent `live_*`
- `src/renderer/src/stores/live.ts` — store reste `live`
- `src/preload/index.ts` — IPC bridge inchange
- Tout ce qui touche a Pulse/REX

## Direction copywriting (Phase 1)

**Ton :** Chaleureux + ludique
**Registre :** "Verifie que l'etincelle a pris" plutot que "Teste tes eleves"
**Exemples d'accroches possibles :**
- "Spark — L'etincelle a-t-elle pris ?"
- "Verifie la comprehension en s'amusant, sans stress"
- "QCM, vrai/faux, nuage de mots — le tout en temps reel, avec le sourire"
- "Un quiz, pas un exam. Un Spark, pas une epreuve."

## Transcription

<details><summary>Voir les Q&R</summary>

**Round 1 (Objectif)** : Meme intervention que Pulse ou different ?
→ Renommer + enrichir. Nouveau nom ET nouvelles features.

**Round 2 (Objectif)** : Quel nom ?
→ Demande d'avis. Contexte : verification comprehension fin de cours, ambiance bienveillante.

**Round 3 (Objectif)** : Spark vs alternatives bienveillantes ?
→ Retour sur Spark apres exploration de Declic, Lumen, Bloom, Flash.

**Round 4 — Contradicteur (Contraintes)** : Qu'est-ce qui manque concretement ?
→ Vrai/Faux rapide + Reponse courte. Pas de mode async.

**Round 5 (Contraintes)** : Scope du renommage code ?
→ Landing + UI seulement. Code interne reste `live`.

**Round 6 — Simplificateur (Contraintes)** : Tout d'un coup ou en phases ?
→ Phase 1 renommage, Phase 2 features. Plus propre.

**Round 7 (Criteres)** : Quel ton pour le copywriting ?
→ Chaleureux + ludique. Fun bienveillant, pas competition.

**Round 8 (Contraintes)** : Spark dans la navbar landing ?
→ Non. Retire de la navbar, comme Pulse.

**Round 9 (Criteres)** : Quelle icone ?
→ Zap (eclair) de Lucide. Coherent avec Spark.

**Round 10 (Criteres)** : Comment fonctionne le matching Reponse courte ?
→ Multi-reponses acceptees + fuzzy Levenshtein (distance 1-2), insensible casse/accents.

</details>
