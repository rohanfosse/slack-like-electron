---
subject: Refonte de la landing page Cursus
type: brownfield
rounds: 9
ambiguity: 17%
created: 2026-03-28
design-system: ui-ux-pro-max
---

# Specification : Refonte de la landing page

## Scores de clarte

| Dimension | Score | Poids | Contribution |
|-----------|-------|-------|-------------|
| Objectif | 0.95 | 35% | 0.333 |
| Contraintes | 0.7 | 25% | 0.175 |
| Criteres de succes | 0.85 | 25% | 0.213 |
| Contexte brownfield | 0.7 | 15% | 0.105 |

## Objectif

Reconstruire la landing page de Cursus autour de la vision clarifiee. Passer de "Slack + Moodle + Kahoot reunis" a **"L'app tout-en-un pour ta promo"**. Simplifier la structure, reduire les features presentees (4 coeur au lieu de 12), et aligner le ton avec le public (mixte : accrocheur en haut, technique en bas).

**Innovation cle** : eclater la demo interactive en mini-demos integrees dans chaque section feature, au lieu d'un bloc demo unique. Chaque feature se demontre elle-meme.

---

## Design System (UI/UX Pro Max)

### Style : Bento + Glassmorphism hybride

Combiner le **Bento Box Grid** (Apple-style, modular, clean) avec des touches de **Glassmorphism** (frosted glass, depth) pour un rendu moderne et premium sans etre generique SaaS.

**Pourquoi** : le Bento donne la structure et la lisibilite, le Glass ajoute de la profondeur et de l'originalite. Ca evite le "flat boring" tout en restant performant.

### Palette de couleurs

Basee sur la recommandation "Micro SaaS" (indigo + emerald) adaptee au contexte educatif :

```css
:root {
  /* Primaire — Indigo educatif (confiance + modernite) */
  --primary: #6366F1;
  --primary-light: #818CF8;
  --primary-dark: #4F46E5;
  --on-primary: #FFFFFF;

  /* Accent — Emeraude (CTA, succes, action) */
  --accent: #059669;
  --accent-light: #34D399;
  --on-accent: #FFFFFF;

  /* Surfaces */
  --bg: #F5F3FF;           /* Lavande tres pale */
  --bg-card: #FFFFFF;
  --bg-glass: rgba(255, 255, 255, 0.6);
  --bg-glass-dark: rgba(15, 23, 42, 0.6);

  /* Texte */
  --text: #1E1B4B;          /* Indigo tres fonce */
  --text-2: #64748B;        /* Gris moyen */
  --text-3: #94A3B8;        /* Gris clair */

  /* Bordures */
  --border: #E0E7FF;
  --border-glass: rgba(255, 255, 255, 0.25);

  /* Semantiques par feature */
  --color-chat: #6366F1;     /* Indigo — communication */
  --color-devoirs: #059669;  /* Emeraude — travail */
  --color-docs: #F59E0B;     /* Ambre — ressources */
  --color-dashboard: #8B5CF6; /* Violet — vue d'ensemble */

  /* Effets */
  --blur: 16px;
  --shadow-sm: 0 2px 8px rgba(99, 102, 241, 0.08);
  --shadow-md: 0 8px 32px rgba(99, 102, 241, 0.12);
  --shadow-glow: 0 0 40px rgba(99, 102, 241, 0.15);

  /* Radius */
  --r-sm: 12px;
  --r-md: 20px;
  --r-lg: 28px;

  /* Spacing (echelle 8dp) */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 24px;
  --sp-6: 32px;
  --sp-7: 48px;
  --sp-8: 64px;
  --sp-9: 96px;

  /* Animations */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth: cubic-bezier(0.22, 1, 0.36, 1);
  --duration-fast: 200ms;
  --duration-normal: 350ms;
  --duration-slow: 600ms;
}

[data-theme="dark"] {
  --primary: #818CF8;
  --primary-light: #A5B4FC;
  --primary-dark: #6366F1;
  --accent: #34D399;
  --accent-light: #6EE7B7;
  --bg: #0F0D1A;
  --bg-card: #1A1733;
  --bg-glass: rgba(26, 23, 51, 0.7);
  --text: #F1F0FF;
  --text-2: #94A3B8;
  --text-3: #475569;
  --border: rgba(129, 140, 248, 0.15);
  --border-glass: rgba(129, 140, 248, 0.12);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 8px 32px rgba(0, 0, 0, 0.4);
  --shadow-glow: 0 0 40px rgba(129, 140, 248, 0.1);
}
```

### Typographie

Garder **Inter** (deja installe, excellent pour UI) mais ajouter de la hierarchie :

```css
/* Scale typographique */
--font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

--text-hero: clamp(3rem, 6vw, 5rem);      /* 48-80px */
--text-h2: clamp(1.75rem, 3vw, 2.5rem);   /* 28-40px */
--text-h3: clamp(1.25rem, 2vw, 1.5rem);   /* 20-24px */
--text-body: 1.125rem;                      /* 18px */
--text-small: 0.875rem;                     /* 14px */
--text-label: 0.75rem;                      /* 12px */

/* Poids — hierarchie par weight */
--w-black: 900;    /* headline hero */
--w-bold: 700;     /* h2, h3 */
--w-semi: 600;     /* labels, CTA */
--w-regular: 400;  /* body */

/* Line heights */
--lh-tight: 1.1;   /* hero */
--lh-heading: 1.3;  /* h2, h3 */
--lh-body: 1.65;    /* body */
```

---

## Structure de la page — Demo eclatee

**Innovation principale** : au lieu de Hero → Demo bloc → Features → Download, la demo est **eclatee** dans chaque section feature. Chaque feature se demontre visuellement en contexte.

```
┌──────────────────────────────────────┐
│  HERO                                │
│  Headline + sous-headline + CTAs     │
│  (pas de demo ici, juste le message) │
└──────────────────────────────────────┘
          ↓ scroll
┌──────────────────────────────────────┐
│  FEATURE 1 — CHAT                    │
│  ┌─────────┐  ┌──────────────────┐   │
│  │  Texte  │  │  Mini-demo Chat  │   │
│  │  + copy │  │  (messages anime)│   │
│  └─────────┘  └──────────────────┘   │
└──────────────────────────────────────┘
          ↓ scroll
┌──────────────────────────────────────┐
│  FEATURE 2 — DEVOIRS                 │
│  ┌──────────────────┐  ┌─────────┐  │
│  │ Mini-demo Devoirs │  │  Texte  │  │
│  │ (soumission anim) │  │  + copy │  │
│  └──────────────────┘  └─────────┘   │
└──────────────────────────────────────┘
          ↓ scroll
┌──────────────────────────────────────┐
│  FEATURE 3 — DOCUMENTS               │
│  ┌─────────┐  ┌──────────────────┐   │
│  │  Texte  │  │ Mini-demo Docs   │   │
│  │  + copy │  │ (viewer anime)   │   │
│  └─────────┘  └──────────────────┘   │
└──────────────────────────────────────┘
          ↓ scroll
┌──────────────────────────────────────┐
│  FEATURE 4 — DASHBOARD               │
│  ┌──────────────────┐  ┌─────────┐  │
│  │ Mini-demo Dash   │  │  Texte  │  │
│  │ (widgets anime)  │  │  + copy │  │
│  └──────────────────┘  └─────────┘   │
└──────────────────────────────────────┘
          ↓ scroll
┌──────────────────────────────────────┐
│  DOWNLOAD                            │
│  3 cards (Win / Mac / Web)           │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│  FOOTER (technique + credits)        │
└──────────────────────────────────────┘
```

**Alternance gauche-droite** : le texte alterne de cote a chaque feature (texte-gauche/demo-droite, puis demo-gauche/texte-droite). Ca cree un rythme visuel en zigzag qui guide l'oeil et evite la monotonie.

---

## Section par section

### 1. Hero

**Layout** : centre, pleine largeur, hauteur viewport (100dvh)

**Contenu** :
- Badge pill en haut : "Open source · v1.x" (petit, discret, lien GitHub)
- Headline : **"L'app tout-en-un pour ta promo"** (clamp 48-80px, weight 900, lh 1.1)
- Sous-headline : **"Chat, devoirs et documents. Un seul endroit."** (18px, text-2, lh 1.65)
- 2 CTAs :
  - Primaire : "Telecharger" (bg accent vert, blanc, icone download, arrondi)
  - Secondaire : "Ouvrir l'app" (outline primary, transparent)
- Fond : gradient radial subtil indigo → transparent (pas de blobs lourds)

**Animations** :
- Headline : fade-in + translateY(30px→0) sur 600ms ease-smooth
- Sous-headline : meme, stagger +100ms
- CTAs : meme, stagger +200ms
- Gradient fond : leger mouvement lent (40s cycle) en CSS `@keyframes`

**Pas de demo dans le hero** — le message suffit. La demo arrive section par section en dessous.

### 2. Feature Chat (texte gauche, demo droite)

**Couleur d'accent** : `--color-chat` (#6366F1 indigo)

**Cote texte** :
- Icone : MessageCircle (Lucide, 48px, couleur indigo)
- Titre : **"Discute avec ta promo"** (h2, 28-40px, bold)
- Sous-titre : "Canaux par promotion, messages directs, mentions, reactions. Tout en temps reel." (body, text-2)
- 3 puces rapides :
  - "Canaux organises par cours"
  - "Mentions @nom et @tous"
  - "Slash commands /devoir /doc"

**Cote mini-demo** :
- Fenetre macOS-style (title bar avec 3 dots, titre "# general")
- Sidebar reduite (4 canaux, 2 DMs — noms tronques)
- 3-4 messages animes qui apparaissent en stagger (350ms chacun)
- Typing indicator en bas ("Jean ecrit...")
- Reaction emoji sur un message (apparait au scroll)
- Tout dans un card glass : `bg-glass`, `backdrop-filter: blur(16px)`, `border-glass`, `shadow-md`
- Bordure gauche coloree `3px solid var(--color-chat)`

**Animation au scroll** : la mini-demo fade-in + translateX(40px→0) quand elle entre dans le viewport (IntersectionObserver, threshold 0.3)

### 3. Feature Devoirs (demo gauche, texte droite)

**Couleur d'accent** : `--color-devoirs` (#059669 emeraude)

**Cote texte** :
- Icone : ClipboardCheck (Lucide, 48px, emeraude)
- Titre : **"Sais toujours quoi rendre"**
- Sous-titre : "Cree des devoirs, suis les depots, note par rubriques. Les etudiants savent ou en sont."
- 3 puces :
  - "5 types : livrable, soutenance, CCTL..."
  - "Notation A-F avec grilles"
  - "Deadlines avec rappels automatiques"

**Cote mini-demo** :
- Card glass avec bordure gauche emeraude
- Liste de 3 devoirs :
  - "Projet Web E4" — badge vert "Rendu" + date
  - "TP Algo" — badge orange "Dans 2j" + progress bar 60%
  - "Rapport stage" — badge gris "Brouillon"
- Animation : les devoirs apparaissent en stagger (200ms), la progress bar s'anime de 0→60%
- Un devoir s'ouvre (expand) pour montrer les details (consignes, fichier joint)

### 4. Feature Documents (texte gauche, demo droite)

**Couleur d'accent** : `--color-docs` (#F59E0B ambre)

**Cote texte** :
- Icone : FolderOpen (Lucide, 48px, ambre)
- Titre : **"Toutes tes ressources, un seul endroit"**
- Sous-titre : "PDF, Word, Excel, liens. Tout est classe, cherchable, et lie aux devoirs."
- 3 puces :
  - "Viewers integres (PDF, Word, Excel)"
  - "Organisation par categorie"
  - "Recherche instantanee"

**Cote mini-demo** :
- Card glass avec bordure gauche ambre
- Grille de fichiers (icones colorees par type) :
  - PDF rouge, DOC bleu, XLS vert, lien externe violet
- Animation : un fichier est "clique" et un viewer PDF miniature s'ouvre (slide-down)
- Barre de recherche en haut avec texte qui s'ecrit ("algo...") et filtrage anime

### 5. Feature Dashboard (demo gauche, texte droite)

**Couleur d'accent** : `--color-dashboard` (#8B5CF6 violet)

**Cote texte** :
- Icone : LayoutDashboard (Lucide, 48px, violet)
- Titre : **"Tout ton semestre en un coup d'oeil"**
- Sous-titre : "Widgets personnalisables. Deadlines, notes, progression, tout ce qui compte pour toi."
- 3 puces :
  - "Dashboard personnalisable"
  - "Notifications en temps reel"
  - "Progression par matiere"

**Cote mini-demo** :
- Card glass avec bordure gauche violet
- Grille 2x2 de mini-widgets :
  - "Prochain devoir" — countdown anime (3j → 2j 23h)
  - "Derniere note" — 14.5/20 avec sparkline
  - "Progression" — barre circulaire qui s'anime de 0→72%
  - "Messages non-lus" — badge 5 qui pulse
- Animation : widgets apparaissent en stagger (150ms), les valeurs s'animent (compteurs, barres)

### 6. Download

**Layout** : fond accent subtil (`--bg` avec overlay glass)

**Contenu** :
- Titre : **"Pret a commencer ?"** (h2)
- Sous-titre : "Disponible sur toutes les plateformes." (text-2)
- 3 cards cote a cote :
  - Windows (icone Monitor) — "Telecharger .exe" — "Windows 10+"
  - macOS (icone Laptop) — "Telecharger .dmg" — "macOS 11+"
  - Web (icone Globe) — "Ouvrir" — "Aucune installation"
- Detection OS : card recommandee a une bordure primary + badge "Recommande"
- CTA repetee : "Ou ouvrir directement → app.cursus.school"

**Cards** : glass effect, hover scale(1.02), transition 200ms

### 7. Footer

**Deux niveaux de lecture** (ton technique ici) :

**Ligne 1** (liens) :
- Fonctionnalites · Telecharger · Se connecter · Confidentialite

**Ligne 2** (technique — pour les devs) :
- "Vue 3 + Electron + Express + SQLite · Open source MIT · Socket.IO"
- Lien GitHub discret

**Ligne 3** (credits) :
- "Concu par Rohan Fosse" + version

---

## Animations et interactions

### Scroll reveal (IntersectionObserver)

Chaque section feature entre dans le viewport avec :
- Le texte : `fadeIn + translateY(20px→0)` 500ms ease-smooth
- La mini-demo : `fadeIn + translateX(±40px→0)` 600ms ease-smooth (direction selon le cote)
- Stagger entre texte et demo : 150ms

```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible')
      observer.unobserve(e.target)
    }
  })
}, { threshold: 0.3 })
```

```css
.feature-section { opacity: 0; transform: translateY(20px); transition: all var(--duration-slow) var(--ease-smooth); }
.feature-section.visible { opacity: 1; transform: translateY(0); }

.mini-demo-right { opacity: 0; transform: translateX(40px); transition: all var(--duration-slow) var(--ease-smooth) 150ms; }
.mini-demo-left { opacity: 0; transform: translateX(-40px); transition: all var(--duration-slow) var(--ease-smooth) 150ms; }
.visible .mini-demo-right, .visible .mini-demo-left { opacity: 1; transform: translateX(0); }
```

### Animations internes des mini-demos

Les animations dans chaque mini-demo ne se lancent que quand la section est visible :
- **Chat** : messages qui apparaissent en stagger (350ms), typing indicator
- **Devoirs** : items stagger (200ms), progress bar anime
- **Documents** : fichiers stagger (120ms), viewer expand
- **Dashboard** : widgets stagger (150ms), compteurs animes, barre circulaire

### Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Responsive

### Desktop (>1024px)
- Features en 2 colonnes (texte + demo cote a cote)
- Download cards en 3 colonnes
- Max-width container : 1200px

### Tablette (768-1024px)
- Features en 2 colonnes mais plus serrees
- Download cards en 3 colonnes

### Mobile (<768px)
- Features en 1 colonne : **texte au-dessus, demo en dessous** (toujours)
- L'alternance gauche-droite disparait en mobile
- Download cards en 1 colonne
- Hero : titre clamp down, CTAs en colonne
- Mini-demos : largeur 100%, hauteur reduite

### Petit mobile (<375px)
- Titre hero : 28px
- Padding : 16px
- Mini-demos : simplifiees (moins d'items)

---

## Copy (texte definitif en francais)

### Hero
- Headline : **"L'app tout-en-un pour ta promo"**
- Sous-headline : **"Chat, devoirs et documents. Un seul endroit."**
- CTA1 : "Telecharger"
- CTA2 : "Ouvrir l'app"
- Badge : "Open source · v1.x"

### Feature Chat
- Titre : **"Discute avec ta promo"**
- Sous-titre : "Canaux par promotion, messages directs, mentions, reactions. Tout en temps reel."

### Feature Devoirs
- Titre : **"Sais toujours quoi rendre"**
- Sous-titre : "Cree des devoirs, suis les depots, note par rubriques. Les etudiants savent ou en sont."

### Feature Documents
- Titre : **"Toutes tes ressources, un seul endroit"**
- Sous-titre : "PDF, Word, Excel, liens. Tout est classe, cherchable, et lie aux devoirs."

### Feature Dashboard
- Titre : **"Tout ton semestre en un coup d'oeil"**
- Sous-titre : "Widgets personnalisables. Deadlines, notes, progression, tout ce qui compte pour toi."

### Download
- Titre : **"Pret a commencer ?"**
- Sous-titre : "Disponible sur toutes les plateformes."

---

## Ce qui disparait (vs landing actuelle)

- **Demo bloc unique** → eclatee en 4 mini-demos contextuelles
- **Stats strip** ("3 plateformes", "Socket.io")
- **Compare section** ("Remplacez 5 outils par un seul")
- **8 features secondaires** (kanban, REX, signature, frise, quiz, DMs, pilotage, PWA)
- **Filtres Etudiant/Professeur**
- **Bento grid 12 cards**
- **Changelog**
- **Blobs animes** → gradient radial subtil
- **Mentions techniques dans le hero**
- **Le cycle automatique 8s entre onglets** → chaque demo est statique/contextuelle

## Ce qui est nouveau

- **Mini-demos par feature** avec animations contextuelles
- **Alternance gauche-droite** en zigzag (rythme visuel)
- **Couleur semantique par feature** (indigo chat, emeraude devoirs, ambre docs, violet dashboard)
- **Glassmorphism** sur les cards de demo (blur + translucide)
- **Palette indigo/emeraude** au lieu de bleu/orange
- **Hero epure** (pas de demo, juste le message)
- **Scroll reveal** avec IntersectionObserver

---

## Criteres d'acceptation

- [ ] Headline = "L'app tout-en-un pour ta promo"
- [ ] Sous-headline = "Chat, devoirs et documents. Un seul endroit."
- [ ] 4 mini-demos contextuelles (une par feature, pas un bloc unique)
- [ ] Alternance gauche-droite sur desktop
- [ ] Chaque feature a sa couleur d'accent semantique
- [ ] Cards de demo en glassmorphism (blur + translucide)
- [ ] Scroll reveal sur chaque section (IntersectionObserver)
- [ ] Animations des mini-demos au scroll (pas au chargement)
- [ ] Aucune mention technique dans le hero
- [ ] Le download est accessible en scroll
- [ ] Footer avec infos techniques pour les devs
- [ ] Responsive mobile : sections en 1 colonne, texte au-dessus
- [ ] Dark/light mode complet
- [ ] `prefers-reduced-motion` respecte
- [ ] Score Lighthouse > 90
- [ ] Contraste texte WCAG AA (4.5:1 minimum)
- [ ] Touch targets 44px minimum sur mobile

---

## Fichiers impactes

- `src/landing/index.html` — rreecrire les sections
- `src/landing/app.js` — 4 mini-demos au lieu de 1 demo a 5 onglets
- `src/landing/style.css` — nouveau design system, glass effects, scroll reveal

## Transcription deep interview

<details><summary>Voir les Q&R (9 rounds)</summary>

**Round 1 — Objectif** : La landing doit parler a tout le monde (etudiants, enseignants, directeurs, recruteurs). C'est le point d'entree universel.

**Round 2 — Objectif** : Le message en 5 secondes = "L'app tout-en-un pour ta promo". Pas les references (Slack/Moodle), pas le probleme (fragmentation), le produit.

**Round 3 — Contraintes** : Refonte complete, pas un patch. Reconstruire autour de la nouvelle vision.

**Round 4 — Contradicteur** : La landing doit creer de la credibilite (projet serieux) et mener au download. Pas besoin de convaincre en autonome (Rohan sera la).

**Round 5 — Contexte** : Garder la demo interactive mais la reduire a 3 onglets (chat, devoirs, dashboard). Retirer quiz et frise.

**Round 6 — Simplificateur** : 4 sections max : Hero → Demo → 4 Features → Download. Supprimer stats strip, compare, changelog, features secondaires.

**Round 7 — Criteres** : Ton mixte par section. Accrocheur/tutoiement en haut (hero, features), technique en bas (footer). Deux niveaux de lecture.

**Round 8 — Headline** : "L'app tout-en-un pour ta promo" confirmee.

**Round 9 — Sous-headline** : "Chat, devoirs et documents. Un seul endroit." — 8 mots, zero jargon.

**Post-interview — Design skill** : UI/UX Pro Max recommande Bento + Glass hybride, palette indigo/emeraude, demo eclatee en mini-demos par feature avec scroll reveal et alternance gauche-droite.

</details>
