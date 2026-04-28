---
subject: Mode demo invite (sandbox sans inscription)
type: brownfield
rounds: 8
ambiguity: 14%
created: 2026-04-28
---

# Specification : Mode demo invite

## Scores de clarte finaux

| Dimension   | Score | Poids | Contribution |
|-------------|-------|-------|-------------|
| Objectif    | 0.95  | 35%   | 0.333 |
| Contraintes | 0.85  | 25%   | 0.213 |
| Criteres    | 0.80  | 25%   | 0.200 |
| Contexte    | 0.85  | 15%   | 0.128 |

**Ambiguite finale : 14%** (seuil de clarte : 20%)

---

## Objectif

Permettre a un visiteur de la landing page (`cursus.school` ou
`app.cursus.school/login`) d'**explorer Cursus pendant 10-15 minutes sans
creer de compte**, dans un environnement sandboxe avec une promo factice
vivante (bots scriptes + presence Socket.IO simulee). Aucune friction :
pas de modal trigger, pas de timeout dur, l'utilisateur convertit quand il
**veut** via un bouton toujours visible.

Cible double :

- **Prof / decideur d'ecole** qui se demande si Cursus remplace
  Moodle/Teams. Veut voir un dashboard riche et un Lumen credible en moins
  de 2 minutes.
- **Etudiant curieux** qui a entendu parler du projet. Veut tester en 30
  secondes sans inscription.

KPI principaux :

- Clic sur un CTA (Telecharger / Creer compte / Email contact)
- Email de contact recu post-demo

## Contraintes

- **Zero friction post-arrivee** : `/demo` charge, choix prof/etudiant en 1
  ecran, on est dans l'app. Pas de modal "Bienvenue !", pas de tutoriel
  interactif obligatoire.
- **Tous les modules accessibles** au max — sauf services externes mockes
  (cf. tableau plus bas).
- **Isolation par session** : 2 visiteurs simultanes ne se voient pas
  (modulo presence Socket.IO fake). Aucune moderation manuelle requise.
- **Promo vivante** : l'utilisateur arrive dans un dataset deja peuple
  (messages historiques, devoirs en cours, poll en cours, sondage Pulse
  cloture, 1 quiz Spark archive avec leaderboard) + bots qui postent
  occasionnellement.
- **Reset eparpille** : DB demo distincte, reset nightly via cron a 04h00
  Paris. Pas de migration des donnees demo vers un vrai compte (out of
  scope V1).
- **Pas de SMTP / OAuth Microsoft / OAuth GitHub reel** : tous mockes
  silencieusement. Toast "Mode demo : email simule" si l'utilisateur fait
  une action qui declencherait normalement un envoi.
- **Bandeau discret** : "Mode demo · [Creer un compte]" sticky en haut,
  hauteur 32px, couleur accent. Pas de compteur d'actions, pas de timer.

## Criteres de succes

- Un visiteur arrivant sur `/demo` est dans l'app fonctionnelle en moins
  de 3 secondes (post-load). Pas d'inscription, pas de "Choisir une
  promo".
- Il peut envoyer un message dans #general, le voit apparaitre, voit un
  bot lui repondre dans les 30 secondes.
- Il peut ouvrir Lumen et lire un chapitre markdown rendu (avec code
  colore + KaTeX + Mermaid).
- Il peut lancer un Spark Quiz et voir le leaderboard se mettre a jour
  (bots simulent les reponses).
- Il peut creer un type de RDV en booking, le voit dans la liste, le toast
  "Email simule" apparait sans qu'aucun email ne parte.
- Il voit le bouton "Creer un compte" en permanence (bandeau + CTA dans
  user menu).
- 2 visiteurs simultanes ne se polluent pas mutuellement.
- Reset 04h00 Paris efface toutes les sessions demo et reinjecte le seed.

## Contexte

### Decisions cles tirees de l'interview

| Question | Reponse |
|----------|---------|
| Cible | Prof CESI/ecole (1) + etudiant curieux (2) |
| Objectif | Conversion + adoption + credibilite |
| KPI | Clic CTA + email contact |
| Niveau interactivite | Sandbox ecriture, tous modules, promo vivante |
| Univers | Promo Demo CESI 2026, 1 promo / 6 canaux |
| Choix role | Au demarrage : "Je suis... [Prof] [Etudiant]" |
| Backend | DB ephemere serveur (`cursus_demo.sqlite`) |
| Acces | URL `/demo` + bouton sur login |
| Isolation | **Hybride** : SQL `tenant_id` par session + presence Socket.IO fake |
| Services externes | Mockes (SMTP, MS Graph, GitHub) |
| Friction sign-up | Bandeau permanent, pas de trigger modal |
| Phasing | 3 jalons (MVP → V2 → V3) |

### Articulation avec l'existant

- Le serveur Express partage le code avec le mode prod, distingue par un
  middleware `demoMode` actif si la requete porte un cookie/header
  `cursus-demo-token`.
- Le routeur Vue distingue les routes publiques (booking) de privees ; on
  ajoute un mode "auth-demo" : la session existe mais avec un token
  `demo-*` et un drapeau `currentUser.demo = true` qui filtre certaines
  actions cote UI.
- L'app utilise deja `useAppStore.restoreSession()` au boot (cf.
  `App.vue:299`). On ajoute une branche : si pas de session restauree mais
  cookie `cursus-demo-token` present, on appelle `/api/demo/session` pour
  obtenir une session demo isolee, puis on enchaine comme une session
  normale.

## Architecture technique

### Vue d'ensemble

```
Browser
  ├─ /demo (landing route Vue)
  │   ├─ Choix role [Prof] [Etudiant]
  │   └─ POST /api/demo/start { role }
  │       └─ retourne { token, sessionId, currentUser }
  │
  ├─ Cookie cursus-demo-token (httpOnly, sameSite=lax, 24h)
  │
  └─ App (mode demo)
      ├─ Bandeau sticky "Mode demo · [Creer un compte]"
      ├─ JWT demo dans Authorization header
      ├─ Toutes les requetes /api/* incluent X-Demo-Session: <sessionId>
      └─ Socket.IO connecte sur namespace /demo
```

### Backend

#### Nouvelle DB : `cursus_demo.sqlite`

Schema identique a la prod, plus une colonne `tenant_id TEXT NOT NULL`
sur **toutes** les tables transactionnelles (messages, devoirs, depots,
documents, polls, quiz_responses, etc.). Le seed nightly insere :

- 1 row par table de configuration globale (promotions, channels,
  event_types, etc.) avec `tenant_id = 'seed'`
- ~30 messages historiques, 5 devoirs, 1 poll en cours, 1 quiz Spark
  archive avec leaderboard, 1 chapitre Lumen lu — tous `tenant_id = 'seed'`

Quand un visiteur demarre une session : on duplique le seed dans son
`tenant_id` (UUID v4), il modifie son tenant exclusivement.

#### Cron de reset (04h00 Paris)

```js
// server/services/demoReset.js
DELETE FROM messages   WHERE tenant_id != 'seed' OR (tenant_id = 'seed' AND id > <seed_max_id>);
DELETE FROM depots     WHERE tenant_id != 'seed';
-- ... pour chaque table transactionnelle
```

Apres reset, on rejoue le seed pour avoir une "nouvelle journee" coherente.

#### Routes API ajoutees

| Methode | Path | Description |
|---------|------|-------------|
| `POST` | `/api/demo/start` | Cree une session demo, copie le seed dans un nouveau `tenant_id`, retourne `{ token, sessionId, currentUser }` |
| `POST` | `/api/demo/end` | Optionnel : termine la session, supprime le tenant. Sinon expiration auto a 24h. |
| `GET` | `/api/demo/status` | Health check (combien de sessions actives, prochain reset) |

#### Middleware `requireDemoOrAuth`

Sur **toutes** les routes /api existantes. Si le token est `demo-*`,
ajoute `req.tenantId = <session.tenantId>` et patch chaque query SQL pour
ajouter `WHERE tenant_id = ?` (via une couche d'abstraction dans
`server/db/connection.js`). Si erreur d'isolation (tenant cross-leak),
log + 403.

#### Mocks services externes

| Service | Mock |
|---------|------|
| SMTP | `mailService.send()` retourne `{ ok: true, demo: true }` sans appel reseau si `req.demoMode` |
| Microsoft Graph | `graphClient.createEvent()` retourne un faux `eventId` + `joinUrl: 'https://teams.microsoft.com/demo-meeting'` |
| GitHub API (Lumen) | Pre-clone d'un repo public CESI au seed (1 repo, 5 chapitres, 1 .ipynb). Tout en lecture seule, aucune ecriture acceptee. |
| Pyodide (Live Code) | Marche tel quel, pas de mock necessaire |

#### Bots scriptes

`server/services/demoBots.js` : un worker leger qui scanne toutes les
sessions demo actives et, par session, tire au hasard une action
(probabilite 5% par minute) :

- Bot prof : poste un message dans un canal, marque un devoir comme rendu,
  cree un type de RDV
- Bot etudiant : poste un message, vote a un poll en cours, "lit" un
  chapitre Lumen (tracking)

Pool de messages predefinis dans `server/services/demoBotMessages.json`.

#### Presence Socket.IO fake

Sur `/demo` namespace : a la connexion d'un visiteur, on emet de fausses
presences (3-5 utilisateurs fictifs en `online`, 1-2 `typing` qui
toggle toutes les 20 secondes, 1 user qui rentre/sort toutes les 2
minutes).

### Frontend

#### Nouvelles routes

```typescript
// router/index.ts
{
  path: '/demo',
  component: () => import('@/views/DemoLandingView.vue'),
  meta: { public: true },
}
```

#### Nouveau composant : `DemoLandingView.vue`

Plein ecran, deux gros boutons :

```
┌─────────────────────────────────────┐
│         Bienvenue dans la demo      │
│                                     │
│         Tu es...                    │
│                                     │
│    ┌──────────┐    ┌──────────┐    │
│    │   Prof   │    │ Etudiant │    │
│    └──────────┘    └──────────┘    │
│                                     │
│   Donnees fictives, reset chaque    │
│   nuit. Aucune inscription.         │
└─────────────────────────────────────┘
```

Au clic : `POST /api/demo/start { role }` → reception du token → store
dans cookie + appStore → `router.replace('/dashboard')`.

#### Bandeau persistent

Nouveau composant `DemoBanner.vue` monte dans `App.vue` si
`appStore.currentUser?.demo === true`. Hauteur 32px, fond accent, texte
blanc :

```
Mode demo · Donnees reset cette nuit  [Creer un compte] [Telecharger]
```

Le main shell se decale de 32px (ajout d'un padding-top sur `.app-shell`
quand demo).

#### Modifications stores

- `useAppStore.currentUser` : ajout de `demo: boolean`
- Nouveau computed `isDemo = computed(() => appStore.currentUser?.demo === true)`
- Filtres dans les composants : si `isDemo`, masquer les boutons "Inviter
  par email", "Configurer SMTP", "Connecter Microsoft" et afficher a la
  place un toast au clic : "Cette action n'est pas disponible en demo,
  cree un compte pour l'utiliser."

#### Bouton "Demo" sur le login

Dans `LoginOverlay.vue`, sous le formulaire :

```
─────── ou ───────

[ Tester en demo (sans inscription) ]
```

## Plan de tests

### Backend

- `tests/backend/demo-isolation.test.js` : 2 sessions demo paralleles, action
  dans l'une, verifier qu'elle n'apparait pas dans l'autre
- `tests/backend/demo-mocks.test.js` : envoi message booking → SMTP non
  appele, retour `demo: true`
- `tests/backend/demo-reset.test.js` : peuple, lance le reset, verifie
  que les tenants sont effaces sauf seed

### Frontend

- `tests/frontend/demo-banner.test.ts` : `isDemo=true` → bandeau visible,
  decalage shell
- `tests/frontend/demo-restrictions.test.ts` : bouton Inviter masque,
  toast affiche

### E2E

- `tests/e2e/demo-flow.spec.ts` : `/demo` → choix etudiant → dashboard
  charge → message envoye → reapparait → recharge la page → message
  toujours present (cookie persistant) → cliquer "Creer un compte" → page
  signup

## Liste des fichiers a creer / modifier

### Nouveaux

| Fichier | Lignes ~ | Role |
|---------|----------|------|
| `server/db/demo-connection.js` | 60 | Connexion `cursus_demo.sqlite`, alter table tenant_id |
| `server/db/demo-seed.js` | 200 | Seed initial (promo, canaux, messages, devoirs, polls, quiz, lumen) |
| `server/routes/demo.js` | 80 | Routes `/api/demo/start`, `/end`, `/status` |
| `server/middleware/demoMode.js` | 50 | Middleware d'isolation tenant_id |
| `server/services/demoBots.js` | 150 | Bots scriptes |
| `server/services/demoBotMessages.json` | - | Pool de messages |
| `server/services/demoReset.js` | 60 | Cron nightly |
| `server/services/demoPresence.js` | 80 | Fake presence Socket.IO |
| `src/renderer/src/views/DemoLandingView.vue` | 120 | Choix prof/etudiant |
| `src/renderer/src/components/layout/DemoBanner.vue` | 70 | Bandeau sticky |
| `src/renderer/src/composables/useDemoMode.ts` | 40 | `isDemo`, `restrictedAction()` |
| `tests/backend/demo-isolation.test.js` | 80 | |
| `tests/backend/demo-mocks.test.js` | 60 | |
| `tests/backend/demo-reset.test.js` | 50 | |
| `tests/frontend/demo-banner.test.ts` | 40 | |
| `tests/e2e/demo-flow.spec.ts` | 70 | |

### Modifies

| Fichier | Changement |
|---------|------------|
| `server/index.js` | Mount `/api/demo`, monter middleware `demoMode` avant les routes existantes, demarrer `demoBots` et `demoReset` cron |
| `server/services/email.js` | Skip envoi si `req.demoMode` |
| `server/services/microsoftGraph.js` | Mock retourne `joinUrl: 'https://teams.microsoft.com/demo-meeting'` si demo |
| `src/renderer/src/router/index.ts` | Ajouter route `/demo` |
| `src/renderer/src/App.vue` | Monter `<DemoBanner v-if="isDemo">`, padding-top sur `.app-shell` quand demo |
| `src/renderer/src/stores/app.ts` | Champ `demo: boolean` sur `currentUser` |
| `src/renderer/src/components/auth/LoginOverlay.vue` | Bouton "Tester en demo" sous le form |
| `src/landing/index.html` | Ajouter CTA "Demo" dans hero |
| `src/landing/style.css` | Styles du nouveau CTA |

## Phasing

### Jalon 1 : MVP (~1 jour)

**But :** un visiteur peut explorer Chat / Devoirs / Lumen / Spark Quiz
sans inscription. 70% du wow effect.

- DB `cursus_demo.sqlite` + migrations + seed minimal (1 promo, 4 canaux,
  20 messages, 3 devoirs, 1 chapitre Lumen)
- Routes `/api/demo/start`, `/api/demo/end`
- Middleware d'isolation tenant_id
- DemoLandingView + DemoBanner
- Bouton login → demo
- Mocks SMTP + MS Graph (silencieux)
- Pas de bots, pas de presence fake — l'utilisateur est seul
- E2E happy path

### Jalon 2 : V2 (~1 jour)

**But :** la promo prend vie. +25% de wow.

- Bots scriptes (messages + activite occasionnelle)
- Live tous modes : Pulse / Code / Board jouables
- Booking : creation type RDV, slots, faux email "envoye"
- Kanban + Frise chronologique
- Cron de reset nightly
- Tests d'isolation 2 sessions paralleles

### Jalon 3 : V3 (~½ jour)

**But :** finitions et conversion.

- Presence Socket.IO fake (online dots, typing)
- Animations entree/sortie utilisateurs (toast "Emma a rejoint le canal")
- Variantes du bandeau selon le role (prof voit "Inviter ta promo en
  demo", etudiant voit "Telecharger l'app")
- Page `/demo/end` avec resume "Tu as envoye X messages, lu Y chapitres,
  vote a Z polls — pret a continuer ?"
- Optionnel : migration des donnees demo vers le compte cree (out of
  scope si trop complexe)

## Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| Tenant cross-leak (visiteur A voit donnees visiteur B) | Critique | Tests isolation systematiques + middleware verifie + audit code review |
| DB demo grossit indefiniment si reset rate | Moyen | Monitoring count tenants, alerte si >100 actifs simultanes |
| Bots scriptes spamment et faussent le KPI "engagement reel" | Faible | Activite bot identifiee dans logs (`source: 'demo-bot'`), exclue du tracking |
| Visiteur fait une action premium (genre `/api/admin/reset-seed`) qui casse la demo | Moyen | Demo mode lock = liste explicite de routes accessibles, le reste retourne 403 "demo restricted" |
| Charge serveur si beaucoup de visiteurs en meme temps | Moyen | Rate limit agressif sur `/api/demo/start` (5/IP/heure), fallback "Reviens dans quelques minutes" |
| Repo Lumen demo (clone GitHub) devient stale | Faible | Pre-bake au build Docker, refresh hebdomadaire optionnel |

## Hors scope V1

- Migration des donnees demo vers un vrai compte (jalon 3 optionnel)
- Demo multi-langue (FR uniquement)
- Demo en mode hors-ligne (PWA cache)
- Personnalisation du dataset par origine (UTM analytics)
- A/B test du bandeau (priorite metier, pas techno)
- Demo desktop Electron (web only — Electron n'a pas de cas d'usage demo)

## Decisions explicites

- **Cookie httpOnly vs localStorage** : cookie. Plus standard pour la
  session demo, evite XSS-induced token leak, geree au niveau back-end.
- **JWT demo expirant 24h** : aligne avec le reset nightly. Si le visiteur
  revient apres 24h, il a une nouvelle session vierge — coherent.
- **Pas de modal "Bienvenue !" tutoriel** : explicit. Q3 a clarifie que
  le visiteur doit pouvoir tester sans perdre de temps. Tutoriel = perte
  de temps.
- **Reset 04h00 Paris (pas UTC)** : les visiteurs FR/UE majoritaires sont
  endormis a 04h, impact minimal.
- **Aucun upload reel en demo** : l'upload de fichier (pour devoirs, DM,
  signature) est mocke avec un faux `file_url: '/demo-files/sample.pdf'`
  servi en lecture seule. Evite la croissance disque et les PII.
