---
name: dm-robustesse
status: backlog
created: 2026-03-29T19:50:22Z
progress: 0%
prd: .claude/prds/dm-robustesse.md
github: https://github.com/rohanfosse/cursus/issues/72
---

# Epic: dm-robustesse

## Overview

Renforcement de la robustesse du systeme de DMs (fiabilite, performance, integrite) suivi de l'ajout des DMs etudiant-etudiant. Phase 1 est un prerequis pour Phase 2.

## Architecture Decisions

1. **Queue offline** : utilise `safeStorage` (deja cree) pour persister les messages non envoyes en localStorage. Max 50 messages en FIFO.

2. **Retry pattern** : 3 tentatives avec backoff exponentiel (1s, 3s, 9s) integre dans le store messages, pas dans useApi (specifique aux DMs pour gerer la queue).

3. **Boite partagee** : pour les DMs etudiant-etudiant, `dm_student_id = min(A, B)`. Reutilise le modele existant sans nouvelle table.

4. **Search limit** : cote serveur, LIMIT 200 sur la requete avant dechiffrement. Pas de changement de schema.

5. **Middleware** : adapter `requireDmParticipant` avec un check `isParticipant(boxId, userId)` qui verifie si l'utilisateur est le box owner OU un peer dans cette boite.

## Technical Approach

### Phase 1 : Robustesse

| Composant | Action | Complexite |
|-----------|--------|-----------|
| `stores/messages.ts` | Retry + queue offline dans sendMessage | Haute |
| `utils/dmQueue.ts` (nouveau) | Queue locale : save, load, flush, max 50 | Faible |
| `server/db/models/messages.js` | LIMIT 200 sur searchDmMessages | Faible |
| `server/services/messages.js` | Verifier existence destinataire avant insert | Faible |

### Phase 2 : DMs etudiant-etudiant

| Composant | Action | Complexite |
|-----------|--------|-----------|
| `server/services/messages.js` | Lever blocage dmPeerId, logique min(A,B) | Moyenne |
| `server/middleware/authorize.js` | Adapter requireDmParticipant | Moyenne |
| `server/db/models/messages.js` | Adapter getRecentDmContacts | Faible |
| `composables/useSidebarDm.ts` | Bouton "+", recherche promo | Moyenne |
| `stores/app.ts` | Adapter openDm pour etudiant-etudiant | Faible |

## Implementation Strategy

```
Phase 1 (robustesse) :
  T1 : Queue offline + retry (dmQueue.ts + messages store)
  T2 : Search limit 200 + validation destinataire (backend)
  T3 : Tests Phase 1
       ↓
Phase 2 (DMs etudiant) :
  T4 : Backend — validation + middleware + contacts
  T5 : Frontend — sidebar DM + recherche + openDm
  T6 : Tests Phase 2
```

T1 et T2 sont parallelisables. T4 et T5 sont parallelisables.

## Task Breakdown Preview

### T1 : Queue offline + retry (frontend)
- Creer `utils/dmQueue.ts` : save/load/flush/maxSize
- Modifier `sendMessage()` dans messages store : retry 3x backoff, fallback queue
- Ecouter event `online` / socket reconnect → flush la queue
- Toasts informatifs a chaque etape

### T2 : Search limit + validation (backend)
- `searchDmMessages()` : ajouter LIMIT 200 ORDER BY created_at DESC
- `validateDm()` : verifier existence dmStudentId dans students table
- Retourner erreurs explicites en francais
- Ajouter flag `truncated` si resultats limites

### T3 : Tests Phase 1
- Tests dmQueue : save, load, flush, max 50, FIFO
- Tests retry : mock reseau, verifier 3 tentatives
- Tests search limit : > 200 messages → truncated
- Tests validation : ID inexistant → erreur claire

### T4 : Backend DMs etudiant (backend)
- `validateDm()` : lever blocage dmPeerId >= 0
- Nouveau check : meme promo si etudiant → etudiant
- Logique boite : dm_student_id = min(sender, recipient)
- `requireDmParticipant` : autoriser acces si participant
- `getRecentDmContacts` : inclure contacts etudiants

### T5 : Frontend DMs etudiant (frontend)
- Sidebar DM : bouton "+" ouvrant recherche
- Recherche : API endpoint GET /api/students/search?promoId=X&q=nom
- Clic resultat → openDm adapte pour etudiant-etudiant
- openDm : calculer dm_student_id = min(myId, peerId)

### T6 : Tests Phase 2
- Tests validation : etudiant meme promo OK, autre promo 403
- Tests middleware : acces boite partagee OK
- Tests contacts : inclut etudiants
- Tests frontend : recherche, selection, ouverture conversation

## Dependencies

- T2 parallelisable avec T1
- T3 depend de T1 + T2
- T4 parallelisable avec T5
- T5 depend de T4 pour les endpoints backend
- T6 depend de T4 + T5

## Success Criteria (Technical)

- [ ] sendMessage retry 3x puis queue si echec
- [ ] Queue offline flush au retour online
- [ ] searchDmMessages LIMIT 200 + flag truncated
- [ ] validateDm verifie existence destinataire
- [ ] Etudiant peut DM un camarade de promo
- [ ] Etudiant ne peut PAS DM un etudiant d'une autre promo
- [ ] requireDmParticipant autorise les boites partagees
- [ ] Sidebar DM : bouton "+" + recherche promo
- [ ] Tests couvrent les 6 taches >= 80%

## Estimated Effort

| Tache | Phase | Estimation | Parallelisable |
|-------|-------|-----------|----------------|
| T1 Queue + retry | 1 | 3h | Oui (avec T2) |
| T2 Search + validation | 1 | 1h | Oui (avec T1) |
| T3 Tests Phase 1 | 1 | 2h | Non (depend T1+T2) |
| T4 Backend DMs etudiant | 2 | 2h | Oui (avec T5) |
| T5 Frontend DMs etudiant | 2 | 3h | Partiellement (depend T4) |
| T6 Tests Phase 2 | 2 | 2h | Non (depend T4+T5) |
| **Total** | | **13h** | |
