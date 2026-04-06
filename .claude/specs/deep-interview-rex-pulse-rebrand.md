---
subject: Renommage REX → Pulse (branding + repositionnement)
type: brownfield
rounds: 10
ambiguity: 9%
created: 2026-04-06
---

# Specification : Renommage REX → Pulse

## Scores de clarte

| Dimension | Score | Poids | Contribution |
|-----------|-------|-------|-------------|
| Objectif | 0.95 | 35% | 33.25% |
| Contraintes | 0.90 | 25% | 22.50% |
| Criteres de succes | 0.90 | 25% | 22.50% |
| Contexte | 0.85 | 15% | 12.75% |
| **Total** | | | **91% clarte** |

## Objectif

Renommer la feature "REX" (Retour d'Experience) en **"Pulse"** et refondre integralement le copywriting pour passer d'un positionnement descriptif/technique a un branding produit memorable et chaleureux, aligne avec l'identite de Cursus.

Pulse = "prendre le pouls de la promo". Coherence latine avec Cursus (parcours → pouls). Ton chaleureux, pedagogue, centre sur l'etudiant.

## Contraintes

- Le code interne reste `rex` partout (routes API `/api/rex/*`, composants Vue `Rex*.vue`, store `rex.ts`, modeles DB `rex.js`, fichiers de test)
- Seuls les elements **visibles par l'utilisateur** changent : landing page, labels UI, navigation, titres, boutons, messages
- La demo interactive de la landing peut etre retravaillee dans le copywriting mais la mecanique (onglets, animations) reste
- Le Live Quiz reste une feature separee, non impactee
- Pulse **n'apparait PAS** dans la navbar de la landing (accessible par scroll uniquement)
- Pulse reste une **section distincte** dans le NavRail de l'app (pas integre aux canaux/cours)
- Icone NavRail : coeur/pouls (ligne ECG) remplace l'icone actuelle

## Non-objectifs (hors scope)

- Refactoring du code interne (renommage fichiers, routes, variables)
- Ajout de nouvelles fonctionnalites a Pulse
- Modification du Live Quiz
- Changement de l'architecture ou du comportement
- Integration de Pulse dans les canaux/cours (reste une section a part)

## Criteres d'acceptation

- [ ] Landing page : la carte bento REX devient Pulse avec nouveau visuel/texte
- [ ] Landing page : la section feature #feat-rex est entierement reecrite (titre, sous-titre, bullets, labels demo)
- [ ] Landing page : Pulse n'apparait PAS dans la navbar (confirme)
- [ ] App UI : le NavRail affiche "Pulse" avec icone coeur/pouls au lieu de "REX"
- [ ] App UI : tous les titres de page, boutons, messages visibles disent "Pulse" au lieu de "REX"
- [ ] App UI : les vues enseignant et etudiant refletent le nouveau nom
- [ ] Ton du copywriting : chaleureux, pedagogue, centre sur l'etudiant (style Duolingo, pas startup ni corporate)
- [ ] Coherence : aucune mention visible de "REX" ne subsiste cote utilisateur

## Hypotheses exposees et resolues

| Hypothese | Challenge | Resolution |
|-----------|-----------|-----------|
| REX doit etre fusionne avec Live Quiz | "Wooclap fait tout en un" | Non — REX reste separe, c'est un renommage/repositionnement |
| Le nom REX est problematique | "Pourquoi changer ?" | Pas assez "produit" — decrit la mecanique mais ne vend pas l'experience |
| Pulse est le bon nom | Alternatives : Echo, Signal, Vox | Pulse choisi — coherence latine avec Cursus, metaphore du pouls, pas de collision |
| Le copywriting actuel suffit | "Juste changer le nom ?" | Non — refonte complete du message, pas un simple remplacement |
| Ton startup vs pedagogue | "Quelle vibe ?" | Chaleureux / pedagogue, centre sur l'etudiant |
| Pulse dans la navbar landing | "Plus de visibilite ?" | Non — accessible par scroll, navbar reste legere |
| Pulse integre aux cours | "Action contextuelle ?" | Non — section distincte dans le NavRail, comme aujourd'hui |
| Icone NavRail | "Garder l'actuelle ?" | Nouvelle icone coeur/pouls (ligne ECG) |

## Contexte technique

### Fichiers impactes (landing)
- `src/landing/index.html` — carte bento (#feat-rex), section feature

### Fichiers impactes (app UI)
- `src/renderer/src/components/rex/TeacherRexView.vue` — labels enseignant
- `src/renderer/src/components/rex/StudentRexView.vue` — labels etudiant
- `src/renderer/src/components/rex/RexPresenterMode.vue` — titre presenter
- `src/renderer/src/components/rex/RexHistoryView.vue` — titre historique
- `src/renderer/src/components/rex/RexStatsView.vue` — titre stats
- `src/renderer/src/components/rex/RexActivityForm.vue` — labels formulaire
- `src/renderer/src/components/rex/RexJoinCodeDisplay.vue` — labels code
- `src/renderer/src/views/RexView.vue` — titre route
- Navigation/NavRail — label + icone menu

### Fichiers NON impactes (code interne)
- `server/routes/rex.js` — routes API restent `/api/rex/*`
- `server/db/models/rex.js` — modele DB inchange
- `src/renderer/src/stores/rex.ts` — store Pinia reste `rex`
- `src/preload/index.ts` — IPC bridge inchange
- Tous les fichiers de test

## Direction copywriting

**Ton :** Chaleureux, pedagogue, inclusif
**Registre :** "Chaque voix compte" plutot que "Prenez le pouls en 30s"
**Exemples d'accroches possibles :**
- "Pulse — Chaque voix compte, meme les plus discretes"
- "Ecoutez votre promo en temps reel, en toute confiance"
- "Nuage de mots, echelles, questions ouvertes — 100% anonyme, 100% bienveillant"

## Transcription

<details><summary>Voir les Q&R</summary>

**Round 1 (Objectif)** : Fusionner REX+Quiz ou renommer ?
→ Renommer + repositionner. REX reste tel quel fonctionnellement.

**Round 2 (Objectif)** : Pourquoi renommer REX ?
→ Pas assez "produit". Decrit la mecanique mais ne vend pas l'experience.

**Round 3 (Contraintes)** : Scope du renommage ?
→ Landing + UI seulement. Code interne reste `rex`.

**Round 4 (Objectif)** : Quel nom ?
→ Pulse — coherence latine avec Cursus, metaphore du pouls, pas de collision.

**Round 5 (Criteres)** : Qu'est-ce qui doit changer concretement ?
→ Landing complete + tous les labels visibles dans l'app.

**Round 6 — Simplificateur (Contraintes)** : Refaire le copywriting ou juste le nom ?
→ Nom + message complet. Refonte integrale du copywriting.

**Round 7 (Criteres)** : Quel ton pour le copywriting ?
→ Chaleureux / pedagogue, centre sur l'etudiant. Style Duolingo.

**Round 8 (Contraintes)** : Pulse dans la navbar landing ?
→ Non. Accessible par scroll uniquement.

**Round 9 — Ontologiste (Contexte)** : Section distincte ou integree aux cours ?
→ Section distincte dans le NavRail, comme aujourd'hui.

**Round 10 (Criteres)** : Quelle icone pour le NavRail ?
→ Coeur/pouls (ligne ECG).

</details>
