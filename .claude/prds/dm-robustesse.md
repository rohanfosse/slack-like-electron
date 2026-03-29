---
name: dm-robustesse
description: Renforcer la robustesse des DMs existants puis ajouter les DMs etudiant-etudiant
status: backlog
created: 2026-03-29T19:50:22Z
---

# PRD: dm-robustesse

## Executive Summary

Renforcer la fiabilite, la performance et l'integrite du systeme de messages directs existant (Phase 1), puis etendre les DMs aux conversations etudiant-etudiant au sein de la meme promo (Phase 2). La Phase 1 est un prerequis technique pour garantir une base solide avant d'elargir l'usage.

## Problem Statement

Le systeme de DMs actuel fonctionne mais presente des fragilites :

1. **Fiabilite** : si le reseau tombe pendant l'envoi, le message est perdu. Aucun retry, aucune queue. L'etudiant voit "Message non envoye" et doit retaper manuellement.

2. **Performance** : la recherche dans les DMs dechiffre TOUS les messages en memoire avant de filtrer. Sur une conversation de 1000+ messages, ca bloque le serveur.

3. **Integrite** : aucune verification cote service que le destinataire existe avant d'inserer le message. Un ID invalide cree un message orphelin chiffre et inaccessible.

4. **Scope limite** : les etudiants ne peuvent contacter que les enseignants. Pas de communication entre pairs pour le travail en groupe, les questions entre camarades, ou l'entraide.

## User Stories

### US1 : Message resilient
**En tant qu'** etudiant,
**je veux** que mon message soit automatiquement re-envoye si le reseau echoue,
**afin de** ne jamais perdre un message que j'ai redige.

**Criteres d'acceptation :**
- [ ] Echec reseau → retry automatique (3 tentatives, backoff exponentiel)
- [ ] Si les 3 tentatives echouent → message stocke localement
- [ ] A la reconnexion → les messages en queue sont envoyes automatiquement
- [ ] Toast informatif a chaque etape (retry, stocke, envoye)

### US2 : Recherche performante
**En tant qu'** utilisateur,
**je veux** que la recherche dans mes DMs reponde en moins de 2 secondes,
**afin de** retrouver rapidement une information dans une longue conversation.

**Criteres d'acceptation :**
- [ ] La recherche DM ne dechiffre pas plus de 200 messages
- [ ] Les resultats sont retournes en < 2 secondes
- [ ] Si plus de 200 messages, un message indique "Resultats limites aux 200 messages recents"

### US3 : Validation stricte
**En tant que** developpeur,
**je veux** que chaque envoi de DM soit valide strictement,
**afin d'** eviter les messages orphelins ou corrompus en base.

**Criteres d'acceptation :**
- [ ] Le destinataire (dmStudentId) est verifie en base avant insertion
- [ ] Le contenu est valide (non vide, <= 10 000 caracteres)
- [ ] Un envoi vers un ID inexistant retourne une erreur claire en francais

### US4 : DM entre etudiants
**En tant qu'** etudiant,
**je veux** envoyer un message direct a un camarade de ma promo,
**afin de** poser des questions, m'entraider, ou coordonner un travail de groupe.

**Criteres d'acceptation :**
- [ ] Un etudiant peut envoyer un DM a n'importe quel etudiant de sa promo
- [ ] Un etudiant ne peut PAS envoyer un DM a un etudiant d'une autre promo
- [ ] Les messages sont chiffres AES-256-GCM
- [ ] La conversation est stockee dans une boite unique (min(A, B))
- [ ] Les deux etudiants voient la meme conversation

### US5 : Trouver un camarade
**En tant qu'** etudiant,
**je veux** trouver un camarade via une recherche dans le sidebar DM,
**afin de** demarrer une nouvelle conversation facilement.

**Criteres d'acceptation :**
- [ ] Le sidebar DM affiche les conversations recentes
- [ ] Un bouton "+" ouvre une recherche par nom
- [ ] La recherche filtre les etudiants de la meme promo
- [ ] Cliquer sur un resultat ouvre la conversation (existante ou nouvelle)

## Functional Requirements

### Phase 1 : Robustesse

#### FR1 : Retry automatique
- 3 tentatives avec backoff exponentiel (1s, 3s, 9s)
- Toast a chaque retry ("Nouvel essai d'envoi...")
- Apres 3 echecs : stockage en queue locale via safeStorage

#### FR2 : Queue offline
- Messages non envoyes stockes dans localStorage (cle `cc_dm_queue`)
- Au retour online (event `online` ou reconnexion socket) : re-envoi sequentiel
- Toast de confirmation pour chaque message envoye depuis la queue
- La queue est videe apres envoi reussi

#### FR3 : Search limite
- `searchDmMessages()` limite le dechiffrement a 200 messages (ORDER BY created_at DESC LIMIT 200)
- Si plus de 200 messages correspondent, ajouter un flag `truncated: true` dans la reponse

#### FR4 : Validation stricte
- Verifier que `dmStudentId` existe dans la table students avant insertion
- Verifier que le contenu n'est pas vide apres trim
- Verifier que le contenu ne depasse pas 10 000 caracteres
- Retourner des erreurs explicites en francais

### Phase 2 : DMs etudiant-etudiant

#### FR5 : Validation elargie
- Lever le blocage `dmPeerId >= 0` dans validateDm()
- Nouveau check : si etudiant envoie a un etudiant, verifier meme promo
- Logique de boite : `dm_student_id = min(sender, recipient)`, `dmPeerId = max(sender, recipient)`

#### FR6 : Middleware adapte
- requireDmParticipant : un etudiant peut acceder a une boite si son ID est soit le `dm_student_id` soit un `author_id` dans la conversation
- Alternative plus simple : autoriser l'acces si `boxId === myId` OU si `boxId === min(myId, peerId)` avec peerId valide

#### FR7 : Contacts etudiants
- getRecentDmContacts : inclure les contacts etudiants (pas seulement enseignants)
- Sidebar DM : bouton "+" ouvrant un champ de recherche
- Recherche : query sur la table students WHERE promo_id = myPromoId AND name LIKE '%query%'

## Non-Functional Requirements

- **Chiffrement** : tous les DMs (enseignant et etudiant) utilisent AES-256-GCM
- **Performance** : retry/queue ne doit pas bloquer l'UI (operations asynchrones)
- **Stockage** : la queue locale ne doit pas depasser 50 messages (FIFO si plein)
- **Retrocompatibilite** : les DMs enseignant-etudiant existants ne sont pas impactes

## Success Criteria

- Un message envoye offline arrive a destination apres reconnexion
- La recherche DM repond en < 2 secondes sur une conversation de 500+ messages
- Un etudiant peut envoyer un DM a un camarade de promo et recevoir une reponse
- Zero message orphelin en base (validation stricte)

## Constraints & Assumptions

- Le chiffrement AES-256-GCM existant est conserve
- La table messages est reutilisee (pas de nouvelle table)
- Le JWT_SECRET ne change pas en production
- La queue offline utilise safeStorage (deja implemente)

## Out of Scope

- DMs de groupe (multi-participants)
- DMs enseignant-enseignant
- Read receipts / indicateur "vu"
- Signalement / blocage d'un contact
- DMs cross-promo
- Migration des anciens messages

## Dependencies

- `src/renderer/src/utils/safeStorage.ts` (deja cree)
- `src/renderer/src/utils/apiResult.ts` (deja cree)
- `server/utils/crypto.js` (chiffrement existant)
- `server/middleware/authorize.js` (requireDmParticipant existant)
