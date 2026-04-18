# Intégration Microsoft 365 / Outlook

Cursus permet à chaque enseignant de connecter son propre compte Microsoft 365
pour synchroniser :

- son calendrier Outlook avec l'agenda Cursus (lecture des événements)
- la création de rappels Cursus avec une réunion Teams associée
- les rendez-vous de la section "Rendez-vous" (Calendly-like)

La connexion se fait depuis **Paramètres → Intégrations** pour chaque prof
individuellement. Chaque prof a ses propres tokens (stockés chiffrés en DB),
aucune donnée ne fuite entre comptes.

## Prérequis côté administrateur

Pour que le bouton "Connecter Microsoft" fonctionne, **une app Azure AD doit
être enregistrée par un administrateur du tenant Microsoft** (une seule fois),
et 3 variables d'environnement doivent être définies côté serveur Cursus.

### 1. Créer l'application dans Azure AD

Rendez-vous sur [portal.azure.com](https://portal.azure.com) avec un compte
admin du tenant Microsoft de votre organisation.

**Menu :** Azure Active Directory → App registrations → **+ New registration**

Remplir :

- **Name** : `Cursus` (ou `Cursus - Production`, `Cursus - Dev`…)
- **Supported account types** : `Accounts in this organizational directory only`
  (single tenant) — suffisant si tous les profs sont dans le même tenant.
  Choisir `Multitenant` seulement si des profs externes doivent se connecter.
- **Redirect URI** :
  - Platform : `Web`
  - URI : `http://localhost:3001/api/bookings/oauth/callback` pour le dev
  - Pour la prod, utiliser l'URL publique du serveur,
    ex: `https://app.cursus.school/api/bookings/oauth/callback`

Cliquer **Register**.

Noter dans la vue "Overview" :

- `Application (client) ID` → sera `AZURE_CLIENT_ID`
- `Directory (tenant) ID` → sera `AZURE_TENANT_ID`

### 2. Générer un client secret

**Menu de l'app :** Certificates & secrets → **+ New client secret**

- **Description** : `cursus-server`
- **Expires** : 24 mois (à renouveler avant expiration)

Cliquer **Add**. **Copier immédiatement la valeur** (elle ne sera plus visible
ensuite). Cette valeur sera `AZURE_CLIENT_SECRET`.

### 3. Ajouter les permissions Graph

**Menu de l'app :** API permissions → **+ Add a permission**

Choisir **Microsoft Graph → Delegated permissions**. Cocher :

- `Calendars.ReadWrite` — lire et créer des événements dans le calendrier
- `OnlineMeetings.ReadWrite` — créer des réunions Teams
- `User.Read` — lire le profil de l'utilisateur (auto-ajouté)
- `offline_access` — obtenir un refresh token (sinon, reconnexion toutes
  les heures)

Cliquer **Add permissions**, puis **Grant admin consent for <tenant>** (bouton
violet en haut). Sans ce consent admin, chaque prof devra approuver l'app
individuellement au premier login.

### 4. Configurer le serveur Cursus

Ajouter au fichier `.env` ou dans les variables d'environnement de production :

```env
AZURE_TENANT_ID=<tenant-id-copié-plus-haut>
AZURE_CLIENT_ID=<application-id-copié-plus-haut>
AZURE_CLIENT_SECRET=<secret-valeur-copiée-plus-haut>

# Optionnel — override de l'URI de redirection (sinon défaut dev)
# AZURE_REDIRECT_URI=https://app.cursus.school/api/bookings/oauth/callback
```

Redémarrer le serveur : `npm run server` ou `pm2 restart cursus`.

## Côté prof

Une fois le serveur configuré :

1. Ouvrir Cursus → clic avatar → **Paramètres**
2. Onglet **Intégrations**
3. Cliquer **Connecter Microsoft**
4. Le navigateur s'ouvre sur la page Microsoft — se connecter avec son
   compte pro
5. Accepter les permissions demandées
6. Revenir dans Cursus — le badge passe en "Connecté"

À partir de ce moment :

- L'agenda Cursus affiche les événements Outlook (en bleu Outlook)
- Le formulaire "Nouveau rappel" propose une case "Créer une réunion Teams"
- Les créneaux de rendez-vous peuvent créer des réunions Teams automatiquement

Le refresh du token est automatique en arrière-plan. La déconnexion est
possible à tout moment via le même écran — elle révoque l'accès côté Cursus.

## Dépannage

### "Erreur OAuth" en cliquant sur "Connecter"

→ Les variables d'env Azure ne sont pas définies ou le serveur n'a pas été
redémarré après la config. Vérifier avec :

```bash
curl http://localhost:3001/api/bookings/oauth/start \
  -H "Cookie: <votre-cookie-auth>"
```

Une réponse avec `ok: false` et un message "AZURE_* missing" signale le
problème.

### "Microsoft connecté" mais aucun événement n'apparaît

→ Le compte utilisé n'a peut-être pas de calendrier (compte perso sans
licence Exchange) ou la fenêtre de fetch (± 1 mois autour de la date
sélectionnée) ne contient pas d'événements. Essayer de changer de mois
dans l'agenda.

### Erreur 401 après quelques jours

→ Le refresh token a expiré (normalement 90 jours de sliding window).
Se reconnecter depuis Paramètres → Intégrations.

## Notes de sécurité

- Les `access_token` et `refresh_token` sont **chiffrés AES-256-GCM** avant
  stockage en DB (`server/utils/msToken.js`). La clé de chiffrement doit
  être définie via `MS_TOKEN_ENC_KEY` (32 bytes hex).
- Chaque prof a ses propres tokens (ligne dans `microsoft_tokens` avec
  `teacher_id`). Aucun accès croisé possible.
- La déconnexion supprime les tokens côté Cursus mais **ne révoque pas
  l'app au niveau Microsoft**. Pour révoquer complètement :
  [myaccount.microsoft.com](https://myaccount.microsoft.com) → Apps → Cursus
  → Révoquer.

## Références techniques

- Implémentation backend : [server/services/microsoftGraph.js](../server/services/microsoftGraph.js)
- Stockage tokens : [server/db/models/bookings.js](../server/db/models/bookings.js) (table `microsoft_tokens`)
- Chiffrement : [server/utils/msToken.js](../server/utils/msToken.js)
- Routes OAuth : [server/routes/bookings.js](../server/routes/bookings.js) (`/api/bookings/oauth/*`)
- Routes Calendar : [server/routes/calendar.js](../server/routes/calendar.js) (`/api/calendar/outlook/*`)
- UI Paramètres : [src/renderer/src/components/modals/settings/SettingsIntegrations.vue](../src/renderer/src/components/modals/settings/SettingsIntegrations.vue)
- Composable partagé : [src/renderer/src/composables/useMicrosoftConnection.ts](../src/renderer/src/composables/useMicrosoftConnection.ts)
