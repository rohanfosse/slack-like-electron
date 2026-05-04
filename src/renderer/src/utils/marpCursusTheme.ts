/**
 * Theme Marp custom aux couleurs Cursus.
 *
 * Marp/Marpit accepte des themes CSS sous forme de chaine. On declare ici un
 * theme nomme "cursus" qui reprend la palette de l'app (accent bleu, fond
 * sombre, typo Inter, codeblocks tokenises). Les auteurs peuvent l'utiliser
 * en ajoutant a leur frontmatter :
 *
 *     ---
 *     marp: true
 *     theme: cursus
 *     ---
 *
 * On enregistre le theme cote LumenSlideDeck via marp.themeSet.add() au
 * boot du composant, une seule fois par instance.
 *
 * Note Marpit : seule la regle `/* @theme cursus * /` (sans espaces) en tete
 * de fichier est obligatoire pour que Marpit accepte le theme. Les selecteurs
 * supportes sont `section`, `section.lead`, `h1..h6`, `p`, `code`, `pre`,
 * `blockquote`, `table`, `a`, `ul`, `ol`, `header`, `footer`.
 */

export const MARP_CURSUS_THEME = `/* @theme cursus */

section {
  --cursus-accent: #818CF8;
  --cursus-accent-rgb: 129,140,248;
  --cursus-bg: #1A1733;
  --cursus-bg-elevated: #221E45;
  --cursus-text: #F1F0FF;
  --cursus-muted: #94A3B8;
  --cursus-border: rgba(129, 140, 248, 0.15);
  --cursus-success: #34D399;
  --cursus-warning: #FBBF24;
  --cursus-danger: #F87171;

  background: var(--cursus-bg);
  color: var(--cursus-text);
  font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 30px;
  padding: 60px 80px;
  line-height: 1.5;
}

section h1,
section h2,
section h3,
section h4,
section h5,
section h6 {
  color: var(--cursus-text);
  font-weight: 700;
  letter-spacing: -0.01em;
  margin-top: 0;
}

section h1 {
  font-size: 1.8em;
  border-bottom: 3px solid var(--cursus-accent);
  padding-bottom: 0.3em;
  margin-bottom: 0.6em;
}
section h2 {
  font-size: 1.4em;
  color: var(--cursus-accent);
  margin-bottom: 0.5em;
}
section h3 {
  font-size: 1.15em;
  color: var(--cursus-accent);
}

section p {
  margin: 0.4em 0;
}

section ul,
section ol {
  margin: 0.4em 0;
  padding-left: 1.4em;
}
section li {
  margin: 0.25em 0;
}
section li::marker {
  color: var(--cursus-accent);
}

section a {
  color: var(--cursus-accent);
  text-decoration: none;
  border-bottom: 1px solid rgba(var(--cursus-accent-rgb),0.4);
}
section a:hover {
  border-bottom-color: var(--cursus-accent);
}

section code {
  background: var(--cursus-bg-elevated);
  color: var(--cursus-accent);
  padding: 0.1em 0.4em;
  border-radius: 4px;
  font-family: 'Fira Code', 'JetBrains Mono', Menlo, Consolas, monospace;
  font-size: 0.85em;
}

section pre {
  background: #0F0D1A;
  border: 1px solid var(--cursus-border);
  border-left: 3px solid var(--cursus-accent);
  padding: 1em 1.2em;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 0.7em;
  line-height: 1.5;
}
section pre code {
  background: transparent;
  color: var(--cursus-text);
  padding: 0;
  font-size: 1em;
}

section blockquote {
  border-left: 3px solid var(--cursus-accent);
  background: rgba(var(--cursus-accent-rgb),0.08);
  margin: 0.6em 0;
  padding: 0.6em 1em;
  color: var(--cursus-text);
  border-radius: 0 8px 8px 0;
}
section blockquote p {
  margin: 0;
}

section table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.6em 0;
  font-size: 0.85em;
}
section th,
section td {
  padding: 0.5em 0.8em;
  text-align: left;
  border-bottom: 1px solid var(--cursus-border);
}
section th {
  color: var(--cursus-accent);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.85em;
  border-bottom: 2px solid var(--cursus-accent);
}
section tr:hover {
  background: rgba(var(--cursus-accent-rgb),0.05);
}

section img {
  max-width: 100%;
  border-radius: 8px;
}

section strong {
  color: var(--cursus-text);
  font-weight: 700;
}
section em {
  color: var(--cursus-muted);
  font-style: italic;
}

section hr {
  border: none;
  border-top: 1px solid var(--cursus-border);
  margin: 1em 0;
}

/* Pagination (paginate: true dans la frontmatter) */
section::after {
  color: var(--cursus-muted);
  font-size: 0.5em;
  font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
}

/* Layout "lead" : grande slide titre centree */
section.lead {
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
section.lead h1 {
  font-size: 2.6em;
  border: none;
  margin-bottom: 0.3em;
}
section.lead h2 {
  font-size: 1.2em;
  color: var(--cursus-muted);
  font-weight: 400;
  margin: 0;
}

/* Layout "invert" : fond clair lavande (utile pour les slides de transition) */
section.invert {
  background: #F5F3FF;
  color: #1E1B4B;
}
section.invert h1,
section.invert h2,
section.invert h3 {
  color: #1E1B4B;
}
section.invert h2 {
  color: #6366F1;
}
section.invert code {
  background: #EDE9FE;
  color: #6366F1;
}
section.invert pre {
  background: #1A1733;
}
section.invert pre code {
  color: #F1F0FF;
}

/* Footer / header personnalises (header: ... / footer: ... dans la frontmatter) */
section header,
section footer {
  font-size: 0.5em;
  color: var(--cursus-muted);
}
`
