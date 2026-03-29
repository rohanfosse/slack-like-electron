# Contribuer a Cursus

Merci de votre interet pour le projet. Ce guide explique comment configurer l'environnement de developpement, soumettre des modifications et signaler des problemes.

## Mise en place

```bash
git clone https://github.com/rohanfosse/cursus.git
cd cursus
npm install
```

Lancer l'application en mode developpement (Electron + hot reload) :

```bash
npm run dev
```

Lancer uniquement le frontend web :

```bash
npm run dev:web
```

Lancer le serveur backend :

```bash
npm run server:dev
```

## Tests

Suite de tests comprehensive (1500+ tests) couvrant frontend, backend et E2E :

```bash
npm test              # Tous les tests (Vitest)
npm run test:watch   # Mode watch pendant le developpement
npm run test:frontend # Tests frontend seulement
npm run test:backend  # Tests backend seulement
npm run test:coverage # Rapport de couverture (objectif 80%+)
npm run test:e2e      # Tests E2E Playwright (critical user flows)
npm run test:e2e:ui   # UI Playwright en mode interactif
```

Avant de soumettre une PR, verifiez que le typage compile sans erreur :

```bash
npx vue-tsc --noEmit
```

## Style de code

Le projet utilise **Vue 3 Composition API** avec **TypeScript**. Quelques regles :

- Ecrire le code (variables, fonctions, commentaires techniques) en anglais.
- Ecrire les labels de l'interface utilisateur en francais.
- Utiliser `<script setup lang="ts">` pour tous les composants Vue.
- Pas d'emojis dans l'interface utilisateur.
- Pas de tirets longs dans les textes.
- Preferer les composables (`src/renderer/src/composables/`) pour la logique reutilisable.
- Typer explicitement les props et les emits avec `defineProps<>()` et `defineEmits<>()`.

## Structure du projet

```
src/
  main/          Processus principal Electron (IPC, base de donnees, fenetre)
  preload/       Bridge IPC entre main et renderer
  renderer/src/  Application Vue 3
    assets/        Images, logo, polices
    components/    Composants Vue organises par domaine
    composables/   Logique reutilisable (hooks)
    constants/     Constantes partagees
    stores/        Stores Pinia
    types/         Types TypeScript
    utils/         Utilitaires (auth, validation, stockage, DMs queue, PDF signing)
    views/         Pages principales
  web/           Build web (PWA) avec shim IPC
  landing/       Page d'accueil publique
server/          Serveur Express + Socket.IO (mode web)
  db/            SQLite : connexion, schema, migrations, models
  routes/        API REST (18 domaines + admin modulaire)
  middleware/    Auth JWT, validation Zod, autorisation (role + promo)
  public/        Console d'administration web
  utils/         Utilitaires (roles, cache, crypto, logger, errors, joinCode)
config/          Configuration Nginx, PM2, Docker
scripts/         Scripts utilitaires (postinstall, seed)
```

## Soumettre une Pull Request

1. Creez une branche depuis `main` avec un nom descriptif (`feat/live-quiz`, `fix/upload-timeout`).
2. Faites vos modifications en suivant les conventions de code.
3. Verifiez que les tests passent (`npm test`) et que le typage est correct (`npx vue-tsc --noEmit`).
4. Poussez votre branche et ouvrez une PR sur GitHub.
5. Decrivez clairement ce que la PR apporte et comment la tester.

Les PRs sont relues avant merge. Attendez-vous a des retours constructifs.

## Signaler un bug

Ouvrez une issue sur [GitHub Issues](https://github.com/rohanfosse/cursus/issues) en precisant :

- La version de l'application (visible dans Parametres, A propos).
- Les etapes pour reproduire le probleme.
- Le comportement attendu et le comportement observe.
- Des captures d'ecran si pertinent.

## Conventions de nommage

| Contexte | Langue | Exemple |
|----------|--------|---------|
| Variables, fonctions, types | Anglais | `getChannelMessages`, `usePrefs` |
| Labels UI, textes affiches | Francais | `Se connecter`, `Mon compte` |
| Noms de fichiers | Anglais, PascalCase pour les composants | `SettingsModal.vue`, `usePrefs.ts` |
| Branches git | Anglais | `feat/dashboard-widgets`, `fix/upload-error` |
| Messages de commit | Anglais ou francais, prefixe conventionnel | `feat:`, `fix:`, `docs:` |
