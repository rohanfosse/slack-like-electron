---
subject: Vision Lumen — qu'est-ce que c'est, ou va l'effort
type: brownfield
rounds: 8
ambiguity: 13%
created: 2026-04-11
---

# Specification : Vision Lumen (recadrage avril 2026)

## Scores de clarte
| Dimension | Score | Poids | Contribution |
|-----------|-------|-------|-------------|
| Objectif | 0.95 | 35% | 0.333 |
| Contraintes | 0.85 | 25% | 0.213 |
| Succes | 0.80 | 25% | 0.200 |
| Contexte | 0.80 | 15% | 0.120 |
| **Total clarte** | | | **0.866** |

## Objectif (en une phrase)

**Lumen est le manuel du cours.** Sa fonction critique est qu'un etudiant puisse, en 5 minutes avant un controle, ouvrir UN chapitre et le lire de maniere fluide. Tout le reste (recherche FTS5, edition, sidebar focus, devoirs<->chapitres) est subordonne a cette fonction.

## Contraintes

- **Pas de nouvel investissement dans le rendu markdown.** Le seuil "suffisant pour le pilote sept 2026" = GFM + code highlight + KaTeX + Mermaid. Ce seuil est **deja techniquement atteint** ([src/renderer/src/components/lumen/LumenChapterViewer.vue](src/renderer/src/components/lumen/LumenChapterViewer.vue), [src/renderer/src/utils/markdown.ts](src/renderer/src/utils/markdown.ts), `katex@0.16.45`, `mermaid@11.14.0`).
- **Pas de callouts/composants riches/theming custom/animations.** Niveau Docusaurus moderne ou Notion = sur-investissement.
- **Anti-rechute auteur :** quand l'envie d'enrichir le rendu ressurgit, c'est un signal d'anxiete d'auteur a rediriger vers l'integration. Confirme et toujours actif (cf. memoire `feedback_lumen_integration_not_beauty.md`).
- Les sous-systemes existants (edition GitHub, FTS5, devoirs<->chapitres) ne sont pas a couper, mais ne sont pas prioritaires non plus tant qu'ils ne servent pas la lecture critique.

## Non-objectifs (hors scope)

- Ameliorer la beaute du rendu markdown.
- Ajouter de nouveaux composants visuels (admonitions, onglets, embeds, theming).
- Investir dans l'editeur in-app (Lumen est lu, pas ecrit dans l'app).
- Ajouter des features sociales/collaboratives sur les chapitres.

## Criteres d'acceptation (testables)

- [ ] **Smoke test rendu** : un chapitre type contenant code (3 langages), KaTeX inline + bloc, Mermaid (sequenceDiagram), tableaux GFM, images, s'ouvre et s'affiche sans regression visuelle. A automatiser (snapshot ou check DOM).
- [ ] **Critere de casse "rendu degrade"** documente : si l'un des elements ci-dessus s'affiche mal, c'est un blocker release, pas un defaut mineur.
- [ ] **Acces 1-clic devoir → chapitre** : depuis un devoir, l'etudiant peut atterrir sur le chapitre/section pertinent en un clic. Le lien existe deja en base — verifier qu'il est expose dans l'UI devoir et qu'il ouvre Lumen sur la bonne ancre.
- [ ] **Robustesse "bon contenu"** : verifier qu'aucun cache obsolete ni brouillon ne peut etre servi a la place de la version publiee.

## Hypotheses exposees et resolues

| Hypothese (round) | Challenge | Resolution |
|-------------------|-----------|-----------|
| Lumen est "tout a la fois" (R1) | Une vision qui n'exclut rien n'est pas une vision | Recentre : Lumen = manuel, le reste est satellite (R2) |
| "Tout sert la lecture" (R3) | Refus de trancher deguise | Force la hierarchie via test 5-min : c'est UN chapitre lu (R4) |
| Le critere de casse = rendu degrade (R5) | Contradiction directe avec la memoire `feedback_lumen_integration_not_beauty.md` | Synthese : il y a un seuil de suffisance ; en dessous = casse, au-dessus = pas d'investissement (R6) |
| Le seuil "suffisant" est ambitieux (R7) | Simplificateur : quel est le PLUS BAS niveau acceptable ? | GFM + code + KaTeX + Mermaid. Rien de plus (R7) |
| Il faut investir dans le rendu | Verification code : KaTeX et Mermaid sont deja la | Le seuil est deja atteint, l'effort va ailleurs (R8) |

## Contexte technique (brownfield)

- **Composant principal** : [src/renderer/src/components/lumen/LumenChapterViewer.vue](src/renderer/src/components/lumen/LumenChapterViewer.vue)
- **Pipeline markdown** : [src/renderer/src/utils/markdown.ts](src/renderer/src/utils/markdown.ts)
- **Sanitisation HTML** : [src/renderer/src/utils/html.ts](src/renderer/src/utils/html.ts)
- **Dependances rendu** : `katex@0.16.45`, `mermaid@11.14.0`, deja installees et utilisees.
- **A explorer pour l'axe d'effort retenu** : la liaison devoir → chapitre cote modele de donnees (`devoirs<->chapitres` epic v2.42, cf. memoire `project_session_v2.42.md`) et son exposition UI cote devoir.

## Axe d'effort prioritaire

**Integration "acces depuis le devoir" : depuis un devoir, l'etudiant ouvre le chapitre/section pertinent en 1 clic.** Toutes les autres pistes (snapshot rendu, perf ouverture, fraicheur contenu) sont secondaires mais bonnes a tester en parallele.

## Transcription

<details><summary>Voir les Q&R</summary>

- **R1** Nature du sujet : "Repenser la vision Lumen" (apres reset).
- **R2** Essence : "Le manuel du cours" — lecture-first, le reste est satellite.
- **R3** Quoi exclure : "Aucune, tout sert la lecture" → drapeau rouge, vision sans exclusion.
- **R4** (Contradicteur) Test 5-min : "Lecture fluide d'UN chapitre" — hierarchie etablie.
- **R5** Critere de casse : "Rendu degrade".
- **R6** (Contradicteur memoire) Tension avec anti-rechute beaute → "Les deux sont vrais : il y a un seuil de suffisance".
- **R7** (Simplificateur) Seuil le plus bas acceptable : GFM + code + KaTeX + Mermaid.
- **R8** Decouverte code : KaTeX et Mermaid deja la → axe d'effort = "Acces depuis le devoir".

</details>
