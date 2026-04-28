# Politique de securite

Cursus prend la securite au serieux. Cette page decrit comment signaler une
vulnerabilite et resume les mesures defensives en place.

## Signaler une vulnerabilite

**Ne creez pas d'issue publique** pour les failles de securite. Privilegiez
l'un des canaux confidentiels suivants :

1. **GitHub Security Advisories** (recommande) :
   [github.com/rohanfosse/cursus/security/advisories/new](https://github.com/rohanfosse/cursus/security/advisories/new)
2. **Email** : `contact@rohanfosse.com` (sujet `[CURSUS-SEC]`)

Merci d'inclure :

- Une description du probleme et de son impact
- Les etapes pour reproduire (proof of concept si possible)
- La version concernee (visible dans **Parametres > A propos**)
- Vos coordonnees pour le suivi (optionnel)

**Engagement de reponse** (best-effort, projet maintenu individuellement) :

| Etape                              | Delai cible    |
|------------------------------------|----------------|
| Accuse de reception                | sous 72 h      |
| Premiere evaluation et triage      | sous 7 jours   |
| Correctif diffuse (severite haute) | sous 30 jours  |

Vous serez tenu au courant de l'avancement et credite (si vous le souhaitez)
dans les notes de version qui publient le correctif.

## Versions supportees

Seule la derniere version stable publiee sur
[releases](https://github.com/rohanfosse/cursus/releases) recoit les
correctifs de securite. Les utilisateurs sont encourages a maintenir leur
installation a jour via l'auto-updater integre.

| Version  | Supportee     |
|----------|---------------|
| 2.256.x  | Oui (active)  |
| < 2.256  | Non           |

## Mesures de securite en place

### Authentification et sessions

- JWT signe HS256, secret minimum 32 caracteres en production
- Expiration 7 jours, refresh sliding window cote client
- Mots de passe hashes avec bcrypt (10 rounds), migration transparente des
  anciens hashes en clair (legacy)
- Rate limiting sur `/api/auth/login` (5 tentatives / 15 min) et
  `/api/auth/register` (5 / heure)
- Verrouillage automatique apres tentatives multiples (table
  `login_attempts`)

### Autorisation (defense en profondeur)

- 4 roles hierarchiques (admin > enseignant > intervenant > etudiant),
  permissions centralisees dans `server/utils/roles.js`
- Middleware `requirePromo` : un etudiant n'accede qu'aux ressources de sa
  promotion
- Middleware `requireDmParticipant` : un utilisateur n'accede qu'a ses
  propres conversations privees
- Rooms Socket.IO scopees par promotion pour le temps reel
- IPC Electron : verifications role et promo dans `handleTeacher`,
  `handlePromo`, jamais de confiance dans le renderer

### Donnees sensibles

- DMs chiffres au repos en AES-256-GCM (cle derivee du JWT secret)
- Tokens OAuth Microsoft chiffres AES-256-GCM en base
- HMAC sur le `state` OAuth (anti-CSRF sur le callback)
- Pas de logging des mots de passe ni des tokens

### Validation et injection

- Validation systematique des entrees avec Zod (schemas par route)
- Prepared statements SQLite (`better-sqlite3`), aucune interpolation de
  chaine dans les requetes
- Sanitisation des messages markdown avec DOMPurify (allowlist tags + attrs)
- Content-Security-Policy stricte sur le bundle web (cf. `src/web/index.html`)
- SSRF guards sur le proxy d'images du link-preview (allowlist hosts publics)

### Uploads

- Taille max configurable (defaut 50 Mo)
- Allowlist d'extensions, MIME-type verifie cote serveur
- Stockage hors de la racine web, servi via route authentifiee
- Chemins normalises pour eviter le path traversal (`..`, symlinks)

### Application Electron

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`
- Bridge IPC type-safe via `contextBridge`, pas d'acces direct aux
  primitives Node depuis le renderer
- Auto-update signe (electron-updater) avec verification de signature
  (Authenticode Windows)
- Update server kill-switch (config distante) pour stopper la diffusion
  d'une version compromise

### Conformite et droits

- RGPD : export complet des donnees personnelles (Art. 20) depuis le
  modal **Parametres > Mon compte**
- Suppression de compte sur demande (etudiant) ou par l'admin (cascade DB)
- Pas de tracking analytics tiers
- Logs serveur sans donnees personnelles (uniquement methode, path, status,
  duree, IP)

## Hors scope

Ne sont pas consideres comme des vulnerabilites :

- Attaques necessitant un acces physique a la machine de l'utilisateur
- Comportements lies a un mot de passe deja compromis
- Auto-XSS dans les outils de developpement (devtools)
- Findings produits uniquement par un scanner sans impact reel demontre
- Vulnerabilites dans les dependances tierces deja signalees a leur projet
  amont (un correctif sera applique apres release upstream)

## Programme de reconnaissance

Pas de bug bounty monetaire (projet personnel sans budget dedie). Les
rapports de qualite sont credites dans le `CHANGELOG` et la page **A
propos** sur demande.
