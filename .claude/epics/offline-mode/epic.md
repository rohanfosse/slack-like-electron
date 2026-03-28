---
name: offline-mode
status: backlog
created: 2026-03-28T16:30:00Z
updated: 2026-03-28T16:30:00Z
progress: 0%
prd: .claude/prds/offline-mode.md
github: (will be set on sync)
---

# Epic: offline-mode

## Overview

Implementer un mode hors-ligne lecture seule pour les etudiants. Les donnees (messages, devoirs, documents) sont cachees localement et servies depuis le cache quand le serveur est injoignable. La synchronisation est automatique et silencieuse au retour en ligne.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Vue Renderer (Stores Pinia)                     │
│  messagesStore / travauxStore / documentsStore   │
│       ↕ (lecture/ecriture)                       │
│  ┌─────────────────────────────────────────┐     │
│  │  offlineCache composable                │     │
│  │  - writeCache(key, data)                │     │
│  │  - readCache(key) → data | null         │     │
│  │  - clearCache()                         │     │
│  └───────────┬─────────────────────────────┘     │
│              │ IPC bridge                        │
├──────────────┼───────────────────────────────────┤
│  Main Process│                                   │
│  ┌───────────▼─────────────────────────────┐     │
│  │  ipc/offline.ts                         │     │
│  │  - offline:write(key, json)             │     │
│  │  - offline:read(key) → json             │     │
│  │  - offline:clear()                      │     │
│  │  Stockage : userData/offline-cache/     │     │
│  └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

## Technical Decisions

1. **Stockage** : fichiers JSON dans `app.getPath('userData')/offline-cache/` via le main process. Pas de SQLite supplementaire (on a deja better-sqlite3 pour le serveur, pas besoin cote client).
2. **Granularite du cache** : un fichier par cle (`messages-{channelId}.json`, `devoirs-{promoId}.json`, `documents-{promoId}.json`)
3. **Strategie de cache** : write-through (ecrire dans le cache a chaque fetch reussi)
4. **Hydratation** : au demarrage, si le serveur est injoignable, charger depuis le cache
5. **Detection** : `navigator.onLine` + timeout sur les requetes API + `appStore.socketConnected`

## Tasks

### T1: IPC offline cache (main process)
Creer `src/main/ipc/offline.ts` avec les handlers IPC pour lire/ecrire le cache JSON.
- `offline:write` : ecrire `{key}.json` dans userData/offline-cache/
- `offline:read` : lire et parser `{key}.json`
- `offline:clear` : supprimer tous les fichiers du cache
- Dependencies : aucune
- Estimation : petit

### T2: Composable useOfflineCache (renderer)
Creer `src/renderer/src/composables/useOfflineCache.ts` qui expose :
- `cacheData(key, data)` : appelle IPC write
- `loadCached(key)` : appelle IPC read
- `clearAll()` : appelle IPC clear
- Dependencies : T1
- Estimation : petit

### T3: Integration messagesStore
Modifier `src/renderer/src/stores/messages.ts` :
- Apres chaque `fetchMessages()` reussi → cacher les messages
- Si fetch echoue (hors-ligne) → charger depuis le cache
- Dependencies : T2
- Estimation : moyen

### T4: Integration travauxStore
Modifier `src/renderer/src/stores/travaux.ts` :
- Apres chaque `fetchStudentDevoirs()` reussi → cacher
- Si fetch echoue → charger depuis le cache
- Dependencies : T2
- Estimation : moyen

### T5: Integration documentsStore
Modifier `src/renderer/src/stores/documents.ts` :
- Apres chaque `fetchDocuments()` reussi → cacher les metadonnees
- Si fetch echoue → charger depuis le cache
- Dependencies : T2
- Estimation : petit

### T6: Detection hors-ligne + indicateur UI
Modifier `src/renderer/src/stores/app.ts` et le NavRail :
- Ecouter `navigator.onLine` / `offline` events
- Afficher un bandeau discret "Mode hors-ligne" dans le NavRail ou TitleBar
- Bloquer les actions d'ecriture avec un toast explicatif
- Dependencies : aucune (parallele avec T1-T5)
- Estimation : moyen

### T7: Sync automatique au retour en ligne
Creer un watcher dans `App.vue` ou composable dedie :
- Quand `appStore.isOnline` passe de false a true → re-fetch toutes les donnees
- Pas de popup, sync silencieuse
- Dependencies : T3, T4, T5, T6
- Estimation : petit

### T8: Tests
- Tests unitaires pour useOfflineCache (mock IPC)
- Tests pour la logique de fallback dans les stores
- Dependencies : T1-T7
- Estimation : moyen

## Parallelization

```
T1 ──→ T2 ──→ T3 (messages)
              T4 (devoirs)    → T7 (sync) → T8 (tests)
              T5 (documents)
T6 (UI indicator) ────────────→
```

T1→T2 sont sequentiels (fondation). T3, T4, T5, T6 sont paralleles. T7 et T8 sont finaux.
