---
name: lumen-acces-devoir-chapitre
description: Acces 1-clic d'un devoir vers le chapitre/section Lumen pertinent, pour servir la lecture critique avant evaluation
status: backlog
created: 2026-04-11T16:03:36Z
---

# PRD: lumen-acces-devoir-chapitre

## Executive Summary

Lumen est le manuel du cours. Sa fonction critique : un etudiant qui ouvre l'app 5 minutes avant un controle doit pouvoir atteindre le chapitre pertinent, le lire, et fermer. L'investissement actuellement le plus rentable pour servir cette fonction n'est PAS d'enrichir le rendu (deja suffisant : GFM + code highlight + KaTeX + Mermaid), mais de **rapprocher le chapitre du devoir**. Quand l'etudiant arrive depuis un devoir, un clic doit l'amener sur la bonne section, sans navigation manuelle.

Ce PRD couvre l'exposition UI et la robustesse du lien `devoir → chapitre/section` qui existe deja partiellement en base depuis l'epic v2.42, et rien d'autre.

Source : `.claude/specs/deep-interview-lumen-vision-2026-04.md` (ambiguite finale 13%, 8 rounds).

## Problem Statement

**Probleme.** Un etudiant qui ouvre un devoir pour le rendre n'a aucun pont rapide vers le chapitre Lumen qui contient les notions necessaires. Il doit :
1. Quitter le devoir mentalement
2. Ouvrir Lumen
3. Naviguer la sidebar
4. Deviner quel chapitre est concerne
5. Trouver la section interne

Cette friction tue la consultation du manuel au moment ou elle est la plus utile (revision, redaction).

**Pourquoi maintenant.** Pilote CESI sept 2026. Le rendu Lumen est techniquement pret (KaTeX 0.16, Mermaid 11.14, deja en place dans `LumenChapterViewer.vue`). Continuer a investir cote rendu = anxiete d'auteur (cf. memoire `feedback_lumen_integration_not_beauty.md`). Le delta utilisateur reel est cote integration.

## User Stories

### US1 — Etudiant en revision avant controle
**En tant qu'** etudiant qui revise un devoir 5 minutes avant un controle,
**je veux** cliquer sur un bouton "Voir le chapitre" depuis le devoir,
**afin d'** atterrir directement sur la section Lumen pertinente sans naviguer.

**Criteres d'acceptation :**
- Depuis la vue d'un devoir, un bouton/lien "Voir le chapitre" est visible si un lien chapitre existe.
- Le clic ouvre Lumen sur le chapitre lie, ancre sur la bonne section si une ancre est definie.
- Si aucun lien n'existe : le bouton n'apparait pas (pas de bouton mort).
- Le retour vers le devoir depuis Lumen est possible en 1 clic (raccourci ou bouton retour).

### US2 — Etudiant qui redige un devoir
**En tant qu'** etudiant en train de rediger une reponse a un devoir,
**je veux** consulter le chapitre source en split ou en superposition,
**afin de** ne pas perdre mon contexte de redaction.

**Criteres d'acceptation :**
- L'ouverture du chapitre lie ne ferme pas le brouillon de devoir (aucune perte de saisie).
- Au retour, le focus revient sur le champ de saisie a la position laissee.
- (Stretch) un mode side-by-side est utilisable sur ecran large.

### US3 — Prof qui lie un chapitre a un devoir
**En tant que** prof qui cree un devoir,
**je veux** selectionner le chapitre/section Lumen associe,
**afin que** mes etudiants y aient acces direct.

**Criteres d'acceptation :**
- Le formulaire de creation/edition d'un devoir expose un selecteur de chapitre Lumen.
- Le selecteur permet (au moins) de choisir le chapitre ; idealement aussi une ancre interne.
- Le lien est sauvegarde sur le devoir et restitue a la prochaine ouverture.
- Le prof peut retirer le lien (champ optionnel).

### US4 — Etudiant qui consulte un devoir sans lien
**En tant qu'** etudiant ouvrant un devoir qui n'a pas de chapitre associe,
**je veux** ne voir aucun bouton mort ni indice trompeur,
**afin de** ne pas etre distrait.

**Criteres d'acceptation :**
- Aucun bouton "Voir le chapitre" affiche.
- Aucun message d'erreur ou texte placeholder.

## Functional Requirements

**FR1.** Le modele devoir doit exposer un champ optionnel `chapitre_id` (et idealement `chapitre_ancre`). Si ce champ n'existe pas encore en base, ajouter via migration ; s'il existe deja (epic v2.42), reutiliser tel quel.

**FR2.** L'API IPC qui sert un devoir doit inclure ces champs de liaison dans son payload, sans rupture des contrats existants.

**FR3.** La vue devoir cote etudiant doit afficher un bouton/lien "Voir le chapitre" conditionnel, avec libelle du chapitre cible.

**FR4.** Le clic sur ce bouton declenche l'ouverture de Lumen sur le chapitre cible, ancre incluse si presente. La navigation doit utiliser le routeur existant (pas de full reload).

**FR5.** L'editeur de devoir cote prof doit exposer un selecteur permettant de choisir/changer/retirer le chapitre lie. Le selecteur lit la liste des chapitres depuis l'index Lumen courant.

**FR6.** Le lien doit etre resilient : si le chapitre cible n'existe plus (renomme, supprime), l'UI doit afficher un etat degrade clair (ex : "Chapitre introuvable") sans planter, et permettre au prof de re-lier.

**FR7.** Au retour de Lumen vers le devoir, l'etat de saisie du brouillon doit etre preserve (pas de perte).

## Non-Functional Requirements

**Performance.** L'ouverture du chapitre via le lien doit etre indiscernable d'une ouverture normale via la sidebar Lumen. Pas de chargement supplementaire visible.

**Robustesse.** Aucun cache obsolete ne doit etre servi a la place de la version publiee actuelle du chapitre. Lien vers `feedback_lumen_integration_not_beauty.md` : la confiance dans le contenu prime sur la beaute.

**Accessibilite.** Le bouton "Voir le chapitre" doit etre clavier-navigable, avoir un libelle aria explicite, et un contraste conforme (cf. memoire `project_phase8_polish.md`).

**i18n.** Libelles en francais (cf. memoire `feedback_no_dashes.md` : pas de tirets longs).

**Compatibilite donnees.** Si un devoir existant n'a pas de chapitre lie, comportement identique a aujourd'hui (FR conditionnelle).

## Success Criteria

**Mesurables :**
1. Depuis n'importe quel devoir ayant un chapitre lie, atteindre le chapitre pertinent prend exactement **1 clic** (verifie en E2E).
2. Le retour devoir → chapitre → devoir conserve **100% de la saisie en cours** (verifie en E2E).
3. **0 regression** sur le rendu Lumen (KaTeX, Mermaid, code highlight, GFM) — smoke test snapshot du chapitre type.
4. **0 bouton mort** : suite de tests qui ouvre tous les devoirs sans chapitre lie et verifie l'absence du bouton.
5. Couverture tests >= 80% sur le code nouveau (regle commune).
6. Le prof peut creer un devoir et lui lier un chapitre **en moins de 30 secondes** (verifie sur soi-meme avant validation).

**Qualitatifs (criteres pilote sept 2026) :**
- Au moins 1 prof autre que Rohan utilise le selecteur sans documentation pendant le pilote.
- Aucun rapport "je trouve pas le cours qui va avec ce devoir" pendant le pilote.

## Constraints & Assumptions

**Contraintes techniques :**
- Stack existante : Electron, Vue 3, IPC main↔renderer, base SQLite locale.
- Ne pas reinvestir dans le rendu markdown (cf. spec deep-interview).
- Pas de nouvelle dependance lourde sans justification.
- Respecter l'ownership/IPC security pattern (cf. memoire `project_session_v2.10.md`).

**Hypotheses a verifier en phase epic :**
- Le champ `chapitre_id` existe deja sur le modele devoir (epic v2.42 mentionne devoirs<->chapitres). A confirmer avant decomposition.
- L'index des chapitres Lumen est accessible cote renderer pour alimenter le selecteur.
- Le routeur Vue de Lumen accepte un parametre d'ancre interne.

**Contraintes de temps :**
- Doit etre livre suffisamment en avance du pilote sept 2026 pour avoir 1 a 2 cycles de feedback.

## Out of Scope

Liste explicite — ces points ne font PAS partie de ce PRD, meme s'ils sont tentants :

- Enrichissement du rendu markdown (callouts, theming, animations, embeds custom).
- Editeur Lumen in-app (Lumen est lu, pas ecrit dans l'app).
- Recherche FTS5 amelioree, ou exposition de la recherche depuis le devoir.
- Mode side-by-side devoir+chapitre sur ecran large (peut devenir un PRD futur — laisse en stretch d'US2).
- Suggestions automatiques de chapitre par IA quand le prof cree un devoir.
- Annotations etudiantes sur le chapitre.
- Mode hors-ligne renforce.
- Statistiques "ce chapitre a ete consulte X fois depuis ce devoir".

## Dependencies

**Internes (code/donnees) :**
- Modele `devoir` et migrations associees (verifier l'etat post v2.42).
- Index des chapitres Lumen cote renderer (`LumenChapterViewer.vue`, `markdown.ts`).
- Routeur Lumen et son support des ancres internes.
- Composants UI devoir (vue etudiant + vue prof).

**Externes :**
- Aucune nouvelle dependance npm anticipee.

**Specs/memoires liees :**
- `.claude/specs/deep-interview-lumen-vision-2026-04.md` (source directe de ce PRD).
- Memoire `feedback_lumen_integration_not_beauty.md` (anti-rechute beaute du rendu).
- Memoire `project_session_v2.42.md` (epic devoirs<->chapitres precedent — etat de depart).
- Memoire `project_workflow_pedagogique.md` (contexte pedagogique reel).
