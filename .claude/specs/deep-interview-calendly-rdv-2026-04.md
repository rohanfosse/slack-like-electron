---
subject: Mini-Calendly integre - Prise de RDV visio tuteurs entreprise
type: brownfield
rounds: 10
ambiguity: 19%
created: 2026-04-16
---

# Specification : Mini-Calendly pour RDV visio tuteurs entreprise

## Scores de clarte
| Dimension | Score | Poids | Contribution |
|-----------|-------|-------|-------------|
| Objectif | 0.95 | 35% | 33.25% |
| Contraintes | 0.80 | 25% | 20.00% |
| Criteres de succes | 0.70 | 25% | 17.50% |
| Contexte technique | 0.70 | 15% | 10.50% |
| **Clarte totale** | | | **81.25%** |

## Objectif

Permettre aux enseignants CESI de creer des types d'evenements (tripartite, suivi, etc.) avec des creneaux de disponibilite, et de partager un lien public aux tuteurs entreprise pour qu'ils reservent un RDV visio. La reservation cree automatiquement un event Outlook + une reunion Teams pour les 3 participants (prof, tuteur, etudiant).

## Flux complet

1. **Prof** cree un type d'evenement dans Cursus (ex: "Tripartite A3", duree 30 min)
2. **Prof** definit ses regles de disponibilite (ex: mardi 14h-17h, jeudi 9h-12h)
3. **Prof** genere un lien unique par etudiant (ex: `cursus.school/book/rohan/tripartite-a3?student=42`)
4. **Prof** envoie le lien au tuteur entreprise (par email, manuellement)
5. **Tuteur** ouvre le lien (page publique, pas de compte Cursus requis)
6. **Tuteur** voit une grille semaine avec les creneaux libres (Outlook sync en temps reel)
7. **Tuteur** choisit un creneau, entre son nom + email
8. **Systeme** cree un event Outlook + reunion Teams (prof + tuteur + etudiant)
9. **Systeme** envoie un email de confirmation au tuteur avec le lien Teams
10. **Etudiant** recoit aussi l'invitation Teams automatiquement
11. **Tuteur** peut annuler ou reporter via un lien dans l'email de confirmation

## Contraintes

- **Microsoft Graph API** obligatoire des le MVP (OAuth2 Azure AD) pour :
  - Lire le calendrier Outlook du prof (dispos reelles)
  - Creer des events Outlook
  - Creer des reunions Teams
- **Email** : nodemailer ou SendGrid pour les confirmations
- **Page publique** : page accessible sans authentification Cursus (token jetable)
- **Serveur** : Express + SQLite existant, pas de nouveau service
- **Teams par defaut** avec fallback lien visio manuel configurable par le prof
- **Duree fixe** par type d'evenement (pas de choix par le tuteur)

## Non-objectifs (hors scope v1)

- Sync bidirectionnelle complete (Cursus ne modifie pas les events Outlook existants)
- Support Google Calendar / Zoom natif (juste Teams + fallback manuel)
- Paiement / facturation
- Gestion des fuseaux horaires complexes (on assume France metropolitaine)
- Rappels automatiques avant le RDV (v2)
- Statistiques de prise de RDV (v2)
- Multi-profs par type d'evenement (v2)

## Criteres d'acceptation

- [ ] Le prof peut creer un type d'evenement avec titre, duree, description
- [ ] Le prof peut definir des regles de disponibilite recurrentes (jour + plage horaire)
- [ ] Le prof peut connecter son compte Microsoft (OAuth2) depuis les settings
- [ ] Les creneaux affiches tiennent compte du calendrier Outlook du prof
- [ ] Un lien unique par etudiant est generable et copiable
- [ ] Le tuteur voit une page publique avec grille semaine des dispos
- [ ] Le tuteur peut reserver sans compte Cursus (nom + email)
- [ ] La reservation cree un event Outlook avec reunion Teams
- [ ] Le prof, le tuteur et l'etudiant recoivent l'invitation
- [ ] Le tuteur peut annuler ou reporter via un lien dans l'email
- [ ] Le creneau redevient libre apres annulation

## Hypotheses exposees et resolues

| Hypothese | Challenge | Resolution |
|-----------|-----------|-----------|
| Outlook optionnel | "Sans sync, double-bookings frequents" | Outlook obligatoire des le MVP |
| Zoom/Meet en alternative | "Pas tous les tuteurs ont Teams" | Teams par defaut + fallback lien manuel |
| Validation manuelle des RDV | "Plus de controle" | Confirmation instantanee (comme Calendly) |
| Lien generique par type | "Comment savoir quel etudiant ?" | Lien unique par etudiant (student param) |
| Email envoye par Cursus | "Complexite email" | Le prof copie-colle le lien lui-meme, email seulement pour confirmation |

## Architecture technique

### Dependances a ajouter
```
@azure/msal-node         — OAuth2 Microsoft (token acquisition)
@microsoft/microsoft-graph-client  — Graph API (calendar, events, online meetings)
nodemailer               — Emails de confirmation/annulation
```

### Schema base de donnees
```sql
-- Types d'evenements (tripartite, suivi, etc.)
CREATE TABLE booking_event_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  color TEXT DEFAULT '#3b82f6',
  fallback_visio_url TEXT,       -- lien visio custom si pas Teams
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Regles de disponibilite recurrentes
CREATE TABLE booking_availability_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL REFERENCES users(id),
  day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,       -- 'HH:MM' format
  end_time TEXT NOT NULL,         -- 'HH:MM' format
  is_active INTEGER DEFAULT 1
);

-- Tokens de reservation (liens partageables)
CREATE TABLE booking_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type_id INTEGER NOT NULL REFERENCES booking_event_types(id),
  student_id INTEGER NOT NULL REFERENCES students(id),
  token TEXT NOT NULL UNIQUE,     -- UUID v4
  created_at TEXT DEFAULT (datetime('now'))
);

-- Reservations
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type_id INTEGER NOT NULL REFERENCES booking_event_types(id),
  student_id INTEGER NOT NULL REFERENCES students(id),
  tutor_name TEXT NOT NULL,
  tutor_email TEXT NOT NULL,
  start_datetime TEXT NOT NULL,
  end_datetime TEXT NOT NULL,
  teams_join_url TEXT,
  outlook_event_id TEXT,          -- ID Graph API pour annulation
  status TEXT DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled','rescheduled')),
  cancel_token TEXT UNIQUE,       -- UUID pour lien annulation
  created_at TEXT DEFAULT (datetime('now'))
);

-- OAuth tokens Microsoft (chiffres)
CREATE TABLE microsoft_tokens (
  teacher_id INTEGER PRIMARY KEY REFERENCES users(id),
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### Fichiers a creer
**Backend :**
- `server/services/microsoft-graph.js` — OAuth2 flow + Calendar + Teams API
- `server/services/email.js` — nodemailer wrapper
- `server/db/models/bookings.js` — CRUD reservations
- `server/routes/bookings.js` — API (types, dispos, reserver, annuler)
- `server/routes/booking-public.js` — Routes publiques (grille dispos, reserver)

**Frontend :**
- `src/renderer/src/components/booking/BookingSettings.vue` — Config types + regles
- `src/renderer/src/components/booking/BookingPublicPage.vue` — Page publique tuteur
- `src/renderer/src/stores/booking.ts` — State management
- `src/renderer/src/views/BookingView.vue` — Vue principale (liste RDV, types)

### Microsoft Graph API
```
Scopes requis :
- Calendars.ReadWrite     (lire/ecrire calendrier Outlook)
- OnlineMeetings.ReadWrite (creer reunions Teams)
- User.Read               (profil enseignant)

Endpoints utilises :
- GET  /me/calendarView?startDateTime=...&endDateTime=...  (busy/free)
- POST /me/events                                          (creer event)
- POST /me/onlineMeetings                                  (creer reunion Teams)
- DELETE /me/events/{id}                                   (annuler)
```

## Transcription

<details><summary>Voir les Q&R (10 rounds)</summary>

**Round 1** — Experience tuteur : grille semaine avec dispos (style Calendly)

**Round 2** — Definition des dispos : regles recurrentes + sync Outlook

**Round 3** — MVP scope : Outlook obligatoire des le depart (eviter double-bookings)

**Round 4** — Visio : Teams automatique via Graph API

**Round 5** — Fallback : Teams par defaut + lien visio manuel configurable

**Round 6** — Distribution lien : prof cree des types d'evenements avec slug, envoie le lien manuellement

**Round 7** — Flux reservation : instantane, email confirmation + event Outlook + Teams

**Round 8** — Duree : fixe par type d'evenement

**Round 9** — Etudiant : invite automatiquement a la reunion Teams (tripartite)

**Round 10** — Annulation : lien dans l'email pour annuler + reporter en un clic

</details>
