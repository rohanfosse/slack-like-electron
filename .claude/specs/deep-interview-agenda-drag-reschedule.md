---
subject: Drag-to-reschedule pour le calendrier Cursus
type: brownfield
rounds: 7
ambiguity: 19.5%
created: 2026-04-19
---

# Specification : Drag-to-reschedule sur l'agenda Cursus

## Scores de clarté finaux

| Dimension | Score | Poids | Contribution |
|-----------|-------|-------|--------------|
| Objectif | 0.92 | 35 % | 0.322 |
| Contraintes | 0.80 | 25 % | 0.200 |
| Critères de succès | 0.65 | 25 % | 0.163 |
| Contexte (brownfield) | 0.80 | 15 % | 0.120 |
| **Ambiguïté résiduelle** | | | **19.5 %** |

## Objectif

Permettre à un prof de **replanifier un rappel ou une deadline de devoir en faisant glisser l'événement** sur une autre date dans la vue agenda (mois/semaine/jour). Gain quotidien : 1 geste au lieu d'ouvrir un formulaire modal.

## Contraintes

### In scope
- Drag uniquement sur événements de type `reminder-*` et `deadline-*` (IDs préfixés, cf. store agenda).
- Persistance DB via les IPC existants :
  - Rappels : `window.api.updateReminder(id, { date })`
  - Deadlines : endpoint à étendre — `window.api.updateDevoir(id, { deadline })` ou équivalent travaux.
- Confirmation **simple** avant un drag de deadline (`useConfirm`).
- UI se rafraîchit après succès (recompute `events` via store).
- Protection contre l'écrasement silencieux en cas d'édition concurrente par un autre prof.

### Out of scope (cette itération)
- **Events Outlook** : pas de drag (nécessiterait write-back Microsoft Graph, autre chantier).
- **Events `start_date`** : pas de drag (rarement ajusté indépendamment de la deadline).
- **Fallback clavier** : pas d'alternative non-souris dans cette v0.
- **Toast Undo** : pas de rollback en 1 clic après drag.
- **Tests E2E Playwright** : pas de scénarios dédiés en v0 (couverture vitest uniquement).
- **Drag de start_date simultanément avec la deadline** : l'utilisateur doit dragger séparément.
- **Récurrence, drag-to-create, duplication** : écartés à l'interview (priorité #1 = drag seul).

### Contrainte temporelle
- Livrable avant le **pilote CESI de septembre 2026** (~5 mois).

### Contrainte technique non-triviale
- **Concurrence** : si 2 profs modifient la même deadline en même temps, la règle attendue est "pas d'écrasement silencieux" → implique un champ `updated_at` ou `version` dans la requête `updateReminder`/`updateDevoir`, et un rejet (ou conflit explicite) côté serveur si la version reçue ne correspond plus.

## Non-objectifs explicitement exclus

- Sync bidirectionnelle Outlook (write-back Microsoft Graph)
- Notifications automatiques aux étudiants lors d'un décalage de deadline (reste manuel via message dans le canal)
- Interdiction de drag sur une deadline avec dépôts existants (choix : on laisse passer avec confirmation simple)
- Edit de la durée (resize) — uniquement le déplacement
- Drag en vue Mois uniquement : les 3 vues doivent être équivalentes

## Critères d'acceptation

- [ ] Drag d'un `reminder-*` en vue semaine/jour le déplace vers la date/heure cible, persiste en DB, la nouvelle position est reflétée dans le store et l'UI
- [ ] Drag d'un `reminder-*` en vue mois le déplace vers le jour cible (heure conservée)
- [ ] Drag d'un `deadline-*` ouvre une modal de confirmation `useConfirm` : "Déplacer {title} du {oldDate} au {newDate} ?"
- [ ] Refus de la confirmation → pas d'appel réseau, pas de mutation du store, l'event revient visuellement à sa position d'origine
- [ ] Succès DB → store mis à jour, badges `unread/mentions` inchangés
- [ ] Échec réseau → toast d'erreur, event revient à sa position d'origine (optimistic update rollback)
- [ ] Conflit de concurrence (ex. version obsolète) → toast "Cette deadline a été modifiée entre-temps. Rechargez." + rollback visuel
- [ ] Aucune régression sur les 1049 tests frontend existants
- [ ] Les events Outlook / start_date ne sont pas draggables (clickable mais non mobiles)

## Hypothèses exposées et résolues

| Hypothèse initiale | Challenge | Résolution |
|---|---|---|
| "On peut livrer les 4 capacités (drag, dessiner, récurrence, dupliquer) avant pilot" | Contradicteur round 4 : chacune a un coût, récurrence = 6-10× les autres | Priorité #1 = drag seul. Les 3 autres deviennent backlog P2/P3. |
| "Drag sur tout, y compris Outlook" | Contexte brownfield : Outlook = lecture seule via Graph | Out of scope explicite. |
| "Il faut la version minimale viable la plus maigre possible" | Simplificateur round 7 : OK pour v0, mais a11y = obligation RGAA pour CESI | Risque noté, a11y à prévoir en P2 post-pilot. |

## Risques et notes

### Risques identifiés non bloquants
1. **A11y RGAA** : le CESI est un établissement public → obligations d'accessibilité. Drag-only sans fallback clavier peut poser problème à audit. *Recommandation* : ajouter a11y en P2 avant diffusion large post-pilote.
2. **Pas d'undo** : un drag accidentel = action destructive sans filet. Le `showUndoToast` existe déjà → coût marginal d'ajout plus tard.
3. **Confirmation deadline sans rapport d'impact** : risque de décaler une deadline sur laquelle X étudiants ont déjà rendu sans en avoir conscience. *Mitigation* : inclure dans le message de confirmation le nombre de dépôts existants (`depots_count` est déjà dans `GanttRow`).
4. **Notifications étudiants manuelles** : un prof peut oublier de prévenir. Risque de dégradation de l'expérience étudiante. *Mitigation* : ajouter un bouton "Poster dans le canal" dans le toast de succès qui ouvre un draft pré-rempli.

## Contexte technique (brownfield)

### Fichiers concernés
- [src/renderer/src/views/AgendaView.vue](src/renderer/src/views/AgendaView.vue) — 1084 lignes, contient le `<VueCal>` et les handlers d'events
- [src/renderer/src/stores/agenda.ts](src/renderer/src/stores/agenda.ts) — `updateReminder`, `fetchEvents`, `events` computed
- [src/renderer/src/composables/useAgendaFilters.ts](src/renderer/src/composables/useAgendaFilters.ts) — transforme `agenda.events` en format VueCal (`_meta` carry-on)
- [src/preload/index.ts](src/preload/index.ts) — exposer `updateDevoir` (ou équivalent pour travaux)
- [src/main/ipc/travaux.js](src/main/ipc/travaux.js) — handler IPC pour update deadline travail
- Backend API travaux : endpoint `PATCH /api/assignments/:id` avec `deadline` — à vérifier présence + support version

### Dépendances externes
- **vue-cal** (lib tierce) : documenter si `event-drop` / `event-drag-create` events sont supportés nativement. Si non → fallback sur drag HTML5 natif sur les cellules.
- **useConfirm** : déjà refactorisé récemment (gère la fuite de resolver), safe à réutiliser.
- **useApi** : déjà refactorisé avec timeout/retry/dedup — peut absorber le `updateReminder` et le nouveau `updateDevoir`.

### Points d'extension recommandés
1. Ajouter dans `stores/agenda.ts` une fonction `updateEventDate(eventId: string, newDate: string): Promise<boolean>` qui dispatch sur le bon endpoint selon le préfixe de `eventId`.
2. Ajouter un champ optimistic `pendingMoves` dans le store (Set d'IDs en cours de drag) pour éviter les double-clicks.
3. Le `CalendarEvent` interface devrait exposer un flag `draggable: boolean` calculé dans les builders (`buildReminderEvent` → true, `buildDeadlineEvent` → true, `buildStartEvent` → false, `buildOutlookEvent` → false).

## Transcription des Q&R

<details><summary>Voir les 7 rounds</summary>

**Round 1 — Axe principal** : Combler des trous fonctionnels (vs fluidifier UX / intégrer Cursus / performance)

**Round 2 — Famille de trous** : Création/édition rapide (vs partage / sync / nouvelles vues)

**Round 3 — Capacités cibles** (multi-select) : les 4 cochées — Dessiner plage, Drag replanifier, Récurrence, Duplication 1-clic

**Round 4 — Contradicteur / Priorité #1** : Drag pour replanifier (écarte récurrence, dessiner, dupliquer pour cette itération)

**Round 5 — Scope draggable** : Rappels + deadlines de devoirs (écarte start_date et Outlook)

**Round 6 — Sécurité deadline** : Confirmation simple (sans rapport d'impact ni notification auto, sans blocage si dépôts)

**Round 7 — Simplificateur / Definition of Done** (multi-select) : Fonctionnel de base uniquement (pas d'a11y clavier, pas d'undo, pas de tests E2E)

</details>
