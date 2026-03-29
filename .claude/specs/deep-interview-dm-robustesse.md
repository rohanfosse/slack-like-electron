---
subject: Robustesse DMs + DMs etudiant-etudiant
type: brownfield
rounds: 10
ambiguity: 22%
created: 2026-03-29
---

# Specification : Robustesse DMs + DMs etudiant-etudiant

## Scores de clarte
| Dimension | Score | Poids | Contribution |
|-----------|-------|-------|-------------|
| Objectif | 0.9 | 35% | 0.315 |
| Contraintes | 0.7 | 25% | 0.175 |
| Criteres de succes | 0.6 | 25% | 0.150 |
| Contexte technique | 0.8 | 15% | 0.120 |
| **Total** | | | **0.760 (ambiguite 22%)** |

## Objectif

Deux phases sequentielles :
- **Phase 1** : Renforcer la robustesse du systeme de DMs existant (fiabilite d'envoi, performance, integrite des donnees)
- **Phase 2** : Ajouter les DMs etudiant-etudiant (libre dans la meme promo, chiffre, contacts recents + recherche)

## Phase 1 : Robustesse

### Fiabilite d'envoi
- Retry automatique sur echec reseau (3 tentatives, backoff exponentiel)
- Queue locale des messages non envoyes (localStorage via safeStorage)
- Re-envoi automatique a la reconnexion

### Performance
- Limiter le dechiffrement search aux 200 derniers messages (eviter explosion memoire)
- Index de recherche cote serveur sur author_name sans dechiffrer le contenu

### Integrite des donnees
- Validation stricte du contenu avant envoi (longueur, caracteres)
- Verification de l'existence du destinataire avant envoi
- Protection contre les messages orphelins

## Phase 2 : DMs etudiant-etudiant

### Regles
- Libre dans la meme promo, pas de restriction
- Chiffrement AES-256-GCM identique aux DMs enseignant
- Boite de conversation = min(studentA_id, studentB_id) — une seule boite par paire
- Le responsable peut toujours lire les DMs (pas de changement)
- Pas de signalement ni blocage (MVP)

### UI
- Sidebar : contacts recents (conversations existantes) + bouton "+" pour chercher un camarade
- Recherche par nom dans la promo

### Backend
- Lever le blocage dmPeerId >= 0 dans validateDm()
- Adapter requireDmParticipant pour les boites partagees (etudiant peut acceder a une boite dont il est participant, pas seulement boxId === myId)
- Adapter getRecentDmContacts pour inclure les contacts etudiants

## Contraintes

- Le chiffrement AES-256-GCM existant est conserve pour tous les DMs
- Le modele de donnees (table messages avec dm_student_id) est reutilise
- Les DMs enseignant-etudiant existants ne sont pas impactes
- Backend inchange pour la phase 1 (sauf search limit)

## Non-objectifs (hors scope)

- DMs de groupe (multi-participants)
- DMs enseignant-enseignant
- Read receipts (phase ulterieure)
- Signalement / blocage d'un contact
- DMs cross-promo (un etudiant ne peut contacter que sa propre promo)

## Criteres d'acceptation

### Phase 1
- [ ] Un message echoue au premier envoi → retry automatique (max 3, backoff)
- [ ] L'app passe offline → les messages sont stockes localement
- [ ] L'app revient online → les messages en queue sont envoyes automatiquement
- [ ] La recherche DM ne dechiffre pas plus de 200 messages
- [ ] Un envoi vers un destinataire inexistant retourne une erreur claire
- [ ] La validation rejette les messages vides ou depassant 10 000 caracteres

### Phase 2
- [ ] Un etudiant peut envoyer un DM a un camarade de la meme promo
- [ ] Un etudiant ne peut PAS envoyer un DM a un etudiant d'une autre promo
- [ ] La conversation est stockee dans la boite min(A, B)
- [ ] Les deux etudiants voient la meme conversation
- [ ] Les messages etudiant-etudiant sont chiffres AES-256-GCM
- [ ] Le sidebar DM affiche les conversations recentes + bouton "+" recherche
- [ ] La recherche "+" filtre les etudiants de la meme promo par nom

## Hypotheses exposees et resolues

| Hypothese | Challenge | Resolution |
|-----------|-----------|-----------|
| Les 4 axes (A+C+D+E) en meme temps | Round 2 — prioriser | DMs etudiant d'abord, mais robustesse encore avant |
| Pas besoin de blocage/signalement | Round 4 — Contradicteur | Accepte pour le MVP, pas de mecanisme anti-harcelement |
| Boite du destinataire vs min(A,B) | Round 5 — choix technique | min(A,B) : une seule boite, pas de fusion a la lecture |
| Chiffrement facultatif pour etudiants | Round 6 — Simplificateur | Rejete : meme chiffrement partout, coherence |
| Les 3 axes robustesse separement | Round 9 | Les 3 ensemble : base beton avant d'ajouter des features |

## Contexte technique

### Fichiers concernes Phase 1

| Fichier | Action |
|---------|--------|
| `src/renderer/src/stores/messages.ts` | Ajouter retry + queue offline dans sendMessage |
| `src/renderer/src/utils/safeStorage.ts` | Deja cree — utilise pour la queue locale |
| `server/db/models/messages.js` | Limiter searchDmMessages a 200 resultats |
| `server/services/messages.js` | Renforcer validation (destinataire existe, contenu valide) |

### Fichiers concernes Phase 2

| Fichier | Action |
|---------|--------|
| `server/services/messages.js` | Lever blocage dmPeerId >= 0, logique boite min(A,B) |
| `server/middleware/authorize.js` | Adapter requireDmParticipant pour boites partagees |
| `server/db/models/messages.js` | Adapter getRecentDmContacts pour contacts etudiants |
| `src/renderer/src/composables/useSidebarDm.ts` | Ajouter bouton "+" et recherche promo |
| `src/renderer/src/stores/app.ts` | Adapter openDm pour etudiant-etudiant |

## Transcription

<details><summary>Voir les Q&R</summary>

**Round 1 (Objectif)** : Qu'est-ce que tu veux changer ou ajouter aux DMs ?
→ A (etudiant-etudiant) + C (read receipts) + D (UX) + E (robustesse)

**Round 2 (Objectif)** : Si un seul en premier, lequel ?
→ A — DMs etudiant-etudiant

**Round 3 (Contraintes)** : Comment les DMs etudiant-etudiant fonctionnent ?
→ A — Libre, meme promo

**Round 4 (Criteres — Contradicteur)** : Comment savoir que c'est reussi ? Pas de blocage ?
→ A — Fonctionnel, point final

**Round 5 (Contraintes)** : Modele de stockage des boites ?
→ C — Je choisis → min(A,B)

**Round 6 (Criteres — Simplificateur)** : Chiffrement etudiant-etudiant ?
→ A — Meme chiffrement AES-256-GCM

**Round 7 (Criteres)** : Comment trouver un camarade ?
→ C — Contacts recents + bouton "+" recherche

**Round 8 (Objectif)** : Resume complet ?
→ Focus robustesse d'abord, renforcer le systeme actuel

**Round 9 (Criteres)** : Quels axes de robustesse ?
→ D — Les 3 (fiabilite + performance + integrite)

**Round 10 (Criteres)** : Plan robustesse complet ?
→ A — C'est complet, cristallise

</details>
