# Contribuer a Cursus

Merci de votre interet pour le projet. Ce guide explique comment configurer
l'environnement de developpement, soumettre des modifications et signaler
des problemes.

## Mise en place

> **Prerequis** : [Node.js](https://nodejs.org/) 20+ (CI sur 22), npm.

```bash
git clone https://github.com/rohanfosse/cursus.git
cd cursus
npm install
```

Lancer l'application desktop en mode developpement (Electron + HMR Vite) :

```bash
npm run dev
```

Lancer uniquement le frontend web (PWA) :

```bash
npm run dev:web
```

Lancer le serveur backend (Express + Socket.IO) :

```bash
npm run server:dev   # avec watch
# ou
npm run server       # production
```

La base SQLite est creee au premier lancement. Pour charger des donnees de
demonstration, ouvrir la console admin et utiliser **Reinitialiser et
peupler**.

## Tests

Le projet maintient une suite de tests complete (200+ fichiers, frontend +
backend + E2E) :

```bash
npm test                # Tous les tests Vitest (frontend + backend)
npm run test:watch      # Mode watch pendant le developpement
npm run test:frontend   # Tests frontend seulement
npm run test:backend    # Tests backend seulement
npm run test:coverage   # Rapport de couverture (objectif 80%+)
npm run test:e2e        # Tests E2E Playwright (flux critiques)
npm run test:e2e:ui     # Playwright en mode interactif (UI)
```

Avant de soumettre une PR, verifiez que le typage compile sans erreur :

```bash
npx vue-tsc --noEmit
```

## Style de code

Le projet utilise **Vue 3 Composition API** avec **TypeScript strict**.

### Regles de langue

- Code (variables, fonctions, commentaires techniques) : **anglais**
- Labels de l'interface utilisateur : **francais**
- Pas d'emojis dans l'interface ni dans les commits
- Pas de tirets longs (`—`) dans les textes affiches

### Patterns

- `<script setup lang="ts">` pour tous les composants Vue
- Composables (`src/renderer/src/composables/`) pour la logique reutilisable
- Stores Pinia (`src/renderer/src/stores/`) pour l'etat partage
- Types explicites sur `defineProps<>()`, `defineEmits<>()`
- Variables CSS plutot que couleurs hardcodees (cf. `assets/css/base.css`)

### Don't

- Pas d'`any` (utiliser `unknown` + narrowing)
- Pas de `console.log` en code committe (utiliser `console.debug` au pire)
- Pas de logique metier dans les vues (extraire en composable / store)

## Structure du projet

```
src/
  main/           Processus principal Electron (IPC, base de donnees, fenetre)
  preload/        Bridge IPC entre main et renderer (contextBridge)
  renderer/src/   Application Vue 3
    assets/         Images, logo, polices, CSS
    components/     Composants Vue organises par domaine
    composables/    Logique reutilisable (hooks)
    constants.ts    Constantes partagees (cles localStorage, timings)
    stores/         Stores Pinia
    types/          Types TypeScript
    utils/          Utilitaires (auth, validation, markdown, queue, PDF)
    views/          Pages racines (mappees au router)
    router/         Configuration vue-router + guards
  web/            Build web (PWA) avec shim window.api en HTTP/socket.io
  landing/        Page d'accueil publique (cursus.school)

server/
  db/             SQLite : connexion, schema, migrations, models
  routes/         API REST (36 fichiers, ~20 domaines metier)
  services/       Email (nodemailer), Microsoft Graph (MSAL), unfurl
  middleware/     Auth JWT, validation Zod, rate limit, role + promo
  socket.js       Socket.IO (presence, typing, push notifications)
  public/         Console d'administration

tests/
  frontend/       Tests Vitest (utils, stores, composables)
  backend/        Tests Vitest (models, routes, middleware, securite)
  e2e/            Tests Playwright (auth, isolation cross-promo)

config/           Configuration Nginx, PM2, Docker
scripts/          Scripts utilitaires (postinstall, seed)
```

## Workflow Pull Request

1. **Branche** : creez une branche depuis `main` avec un nom descriptif
   (`feat/live-quiz`, `fix/upload-timeout`, `docs/security-policy`).
2. **Commits** : prefixe conventionnel (`feat:`, `fix:`, `docs:`, `chore:`,
   `refactor:`, `test:`). Messages en francais ou anglais.
3. **Tests** : verifiez que `npm test` et `npx vue-tsc --noEmit` passent.
4. **Push + PR** : ouvrez la PR sur GitHub, decrivez ce que la PR apporte
   et comment la tester. Les screenshots sont apprecies pour les changes
   visuels.
5. **Review** : les PRs sont relues avant merge. Attendez-vous a des
   retours constructifs.

Pour les contributions importantes, ouvrir une issue de discussion avant
de commencer evite les surprises.

## Signaler un bug

Ouvrez une issue sur [GitHub Issues](https://github.com/rohanfosse/cursus/issues)
en precisant :

- La version de l'application (visible dans **Parametres > A propos**)
- La plateforme (Windows / macOS / web)
- Les etapes pour reproduire le probleme
- Le comportement attendu et le comportement observe
- Des captures d'ecran si pertinent
- La sortie de la console DevTools (`Ctrl+Shift+I` dans l'app desktop)

**Failles de securite** : ne creez pas d'issue publique — voir
[SECURITY.md](SECURITY.md) pour les canaux confidentiels.

## Conventions de nommage

| Contexte                              | Langue                | Exemple                                |
|---------------------------------------|-----------------------|----------------------------------------|
| Variables, fonctions, types           | Anglais               | `getChannelMessages`, `usePrefs`       |
| Labels UI, textes affiches            | Francais              | `Se connecter`, `Mon compte`           |
| Noms de fichiers (composants)         | Anglais, PascalCase   | `SettingsModal.vue`, `MessageList.vue` |
| Noms de fichiers (composables, utils) | Anglais, camelCase    | `usePrefs.ts`, `formatDate.ts`         |
| Branches git                          | Anglais               | `feat/dashboard-widgets`               |
| Messages de commit                    | Prefixe conventionnel | `feat:`, `fix:`, `docs:`               |

## Code de conduite

Sois respectueux. Critique le code, pas la personne. On apprend tous.
