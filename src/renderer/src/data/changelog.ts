// Changelog interne consomme par WidgetActuCursus.
// Mise a jour manuelle a chaque release. Garder les 5 dernieres entrees,
// avec 3-5 highlights par release. Format markdown-like simple (pas de
// rendu MD : les highlights sont du texte plat).

export interface ChangelogEntry {
  version: string
  date: string
  title: string
  highlights: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.166.4',
    date: '2026-04-19',
    title: 'Aper\u00e7u PDF : erreurs explicit\u00e9es + fallbacks',
    highlights: [
      'V\u00e9rification HTTP status (401/404/500) au lieu d\'avaler les error pages comme du contenu',
      'MIME devin\u00e9 par extension quand le serveur renvoie octet-stream',
      'Erreur visible dans la modal avec d\u00e9tail technique + bouton T\u00e9l\u00e9charger en fallback',
      'Console log d\u00e9taill\u00e9 pour le debugging',
    ],
  },
  {
    version: '2.166.3',
    date: '2026-04-19',
    title: 'Documents : actions dans un menu \u201c\u2026\u201d',
    highlights: [
      'Ancien overlay hover satur\u00e9 supprim\u00e9 (visuellement bruyant)',
      'Bouton \u201c\u2026\u201d top-right ouvre un menu propre avec toutes les actions',
      'Type chip (Tableur, PDF, etc.) deplac\u00e9 inline dans la meta',
      'Card respire enfin sans 6 ic\u00f4nes empil\u00e9es',
    ],
  },
  {
    version: '2.166.2',
    date: '2026-04-19',
    title: 'Agenda semaine : jours plus visibles + devoirs apaises',
    highlights: [
      'Headers de jour redesignes : nom du jour au-dessus, numero plus gros (style Apple Calendar)',
      'Devoirs all-day : fond tinte avec la couleur de la promo (au lieu du flat satur\u00e9)',
      'Barre laterale 3px qui preserve l\'identite couleur',
      'UPPERCASE letter-spaced retire des headers de colonnes',
    ],
  },
  {
    version: '2.166.1',
    date: '2026-04-19',
    title: 'Lumen : rendu markdown apaise',
    highlights: [
      'Headings sobres : drop des border-bottom et border-left accent',
      'Blockquote = vraie citation litteraire (separe des admonitions)',
      'Tables, code blocks et inline code en sentence case',
      'text-wrap: balance sur tous les titres pour des coupures propres',
    ],
  },
  {
    version: '2.166.0',
    date: '2026-04-19',
    title: 'Widgets alignes sur la voix Cursus',
    highlights: [
      'Plus Jakarta Sans pour les labels widgets et hero numbers',
      'Headers en sentence case (fini les UPPERCASE letter-spaced)',
      'Hover spring + halo accent au lieu du simple lift',
      'Streak, Pomodoro, Clock et autres : chiffres en display tabulaire',
    ],
  },
  {
    version: '2.165.0',
    date: '2026-04-19',
    title: 'Six nouveaux widgets dashboard',
    highlights: [
      'WidgetMessages : inbox miniature avec DMs et mentions non lus',
      'WidgetAgendaJour : agenda detaille du jour pour le prof',
      'WidgetFeedbackTemplates : raccourcis pour vos retours frequents',
      'WidgetRendus : devoirs en attente de note cote etudiant',
      'WidgetCahier : raccourci vers vos cahiers collaboratifs',
      'WidgetActuCursus : ce changelog 🙂',
    ],
  },
  {
    version: '2.164.2',
    date: '2026-04-19',
    title: 'Empty states unifies',
    highlights: [
      '17 widgets migrent vers le composant EmptyState partage',
      '95 lignes de CSS dupliquee supprimees',
    ],
  },
  {
    version: '2.164.1',
    date: '2026-04-19',
    title: 'accentColor + UiWidgetHeaderLink',
    highlights: [
      'Couleur d\'accent sentinelle unifiee sur 6 widgets',
      'Composant UiWidgetHeaderLink pour le pattern "Ouvrir ›"',
    ],
  },
  {
    version: '2.164.0',
    date: '2026-04-19',
    title: 'UiWidgetCard + 36 widgets refondus',
    highlights: [
      'Nouveau wrapper UiWidgetCard (header + slot extra) pour tous les widgets',
      'Couleurs hex hardcodees remplacees par des tokens semantiques',
      'Accessibilite : Space + focus-ring sur tous les widgets cliquables',
      'Performance : WidgetGroupMembers parallelise ses appels IPC',
    ],
  },
]
