---
name: offline-mode
description: Mode hors-ligne lecture seule avec cache local et sync auto
status: active
created: 2026-03-28T16:30:00Z
---

# PRD: offline-mode

## Executive Summary

Permettre aux etudiants de consulter leurs messages, devoirs et documents meme sans connexion internet. Les donnees sont cachees localement via l'API Electron (SQLite ou fichiers JSON). Au retour en ligne, la synchronisation se fait automatiquement en arriere-plan sans intervention de l'utilisateur.

## Problem Statement

Actuellement, Cursus necessite une connexion internet permanente. Les etudiants en deplacement, en cours sans WiFi, ou avec une connexion instable ne peuvent pas consulter leurs devoirs ni relire les messages du canal. Cela reduit l'utilite de l'app desktop par rapport a une simple webapp.

## User Stories

**US-1 : Consultation des messages hors-ligne**
En tant qu'etudiant, je veux pouvoir lire les messages de mes canaux meme sans internet, afin de retrouver les informations partagees en cours.
- Critere d'acceptation : les 50 derniers messages par canal sont lisibles hors-ligne
- Critere d'acceptation : un indicateur visuel montre que l'app est hors-ligne

**US-2 : Consultation des devoirs hors-ligne**
En tant qu'etudiant, je veux voir la liste de mes devoirs et leurs details (description, deadline, feedback) sans connexion.
- Critere d'acceptation : tous les devoirs de la promo active sont caches
- Critere d'acceptation : les deadlines restent visibles avec le bon countdown

**US-3 : Consultation des documents hors-ligne**
En tant qu'etudiant, je veux acceder aux documents partages (metadonnees + liens) sans connexion.
- Critere d'acceptation : la liste des documents est cachee avec nom, type, categorie
- Critere d'acceptation : les fichiers eux-memes ne sont PAS caches (trop volumineux)

**US-4 : Synchronisation automatique**
En tant qu'etudiant, je veux que mes donnees se mettent a jour automatiquement quand je retrouve internet.
- Critere d'acceptation : la sync demarre dans les 5 secondes apres reconnexion
- Critere d'acceptation : pas de popup ni d'action requise
- Critere d'acceptation : les nouvelles donnees remplacent le cache sans doublon

**US-5 : Indicateur de statut connexion**
En tant qu'utilisateur, je veux savoir si je suis en ligne ou hors-ligne.
- Critere d'acceptation : un indicateur discret dans la barre de titre ou le nav rail
- Critere d'acceptation : distinction entre "hors-ligne" et "reconnexion en cours"

## Functional Requirements

1. **Cache local** : stocker messages, devoirs et metadonnees documents dans le stockage Electron (localStorage, IndexedDB, ou fichier JSON via IPC)
2. **Hydratation au demarrage** : charger les donnees depuis le cache si le serveur est injoignable
3. **Ecriture du cache** : mettre a jour le cache a chaque fetch reussi depuis le serveur
4. **Detection hors-ligne** : ecouter `navigator.onLine` + echec de requete API
5. **Sync au retour** : re-fetch les donnees modifiees quand la connexion revient
6. **Lecture seule** : aucune action d'ecriture (envoyer message, deposer devoir) en mode hors-ligne -- afficher un message explicatif

## Non-Functional Requirements

- Le cache ne doit pas depasser 50 Mo par utilisateur
- Le temps de chargement depuis le cache doit etre < 200ms
- La sync ne doit pas bloquer l'UI (arriere-plan)
- Compatible avec le systeme de multi-promo existant (cacher les donnees de la promo active)

## Success Criteria

- Un etudiant peut couper le WiFi, relancer l'app, et lire ses messages/devoirs
- La sync au retour en ligne se fait sans intervention en < 10 secondes
- Aucune regression sur le fonctionnement en ligne

## Constraints & Assumptions

- Electron a acces au filesystem local (pas de contrainte navigateur)
- Le serveur backend ne necessite aucune modification (le cache est cote client uniquement)
- On reutilise les stores Pinia existants (appStore, messagesStore, travauxStore, documentsStore)
- SQLite embarque dans Electron (better-sqlite3) est deja disponible

## Out of Scope

- Envoi de messages hors-ligne (queue offline)
- Depot de devoirs hors-ligne
- Cache des fichiers binaires (PDF, images)
- Mode hors-ligne pour les enseignants
- Synchronisation temps-reel (WebSocket) hors-ligne
- Conflit de donnees (lecture seule = pas de conflit possible)

## Dependencies

- Stores Pinia existants : `appStore`, `messagesStore`, `travauxStore`, `documentsStore`
- Preload bridge IPC existant : `src/preload/index.ts`
- Detection connexion existante : `appStore.isOnline`, `appStore.socketConnected`
