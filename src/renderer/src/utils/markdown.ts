/** Markdown renderer pour Lumen — marked + DOMPurify pour eviter XSS. */
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'

// Configuration de marked : code highlighting + breaks + GFM
marked.setOptions({
  gfm: true,
  breaks: true,
})

// Hook pour highlight.js sur les blocs de code
marked.use({
  renderer: {
    code(token) {
      const code = typeof token === 'string' ? token : token.text
      const lang = typeof token === 'string' ? '' : (token.lang ?? '')
      const validLang = lang && hljs.getLanguage(lang)
      const highlighted = validLang
        ? hljs.highlight(code, { language: lang }).value
        : hljs.highlightAuto(code).value
      const cls = validLang ? `language-${lang}` : ''
      return `<pre class="lumen-code"><code class="hljs ${cls}">${highlighted}</code></pre>`
    },
  },
})

// Slug : transforme un titre en identifiant stable (minuscules, accents retires,
// espaces -> tirets). Utilise par le TOC du reader pour l'ancrage.
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'heading'
}

// Injecte des IDs slug uniques sur tous les h1-h6 du HTML rendu.
// Passe par des regex plutot que DOMParser pour rester side-effect-free.
function injectHeadingIds(html: string): string {
  const seen = new Map<string, number>()
  return html.replace(/<(h[1-6])>([\s\S]*?)<\/\1>/g, (_, tag, inner) => {
    const text = inner.replace(/<[^>]+>/g, '')
    let slug = slugifyHeading(text)
    const count = seen.get(slug) ?? 0
    seen.set(slug, count + 1)
    if (count > 0) slug = `${slug}-${count}`
    return `<${tag} id="${slug}">${inner}</${tag}>`
  })
}

// Mots-cles pedagogiques a mettre en evidence dans le rendu : wrap dans
// un span stylise avec classe dediee. Detection uniquement en debut de
// mot (word boundary) et uniquement dans le texte (pas dans les blocs
// de code pour ne pas colorer les TODO du code source).
const KEYWORD_PATTERNS: Array<{ word: string; cls: string }> = [
  { word: 'TODO',    cls: 'lumen-kw-todo' },
  { word: 'FIXME',   cls: 'lumen-kw-todo' },
  { word: 'WARNING', cls: 'lumen-kw-warn' },
  { word: 'ATTENTION', cls: 'lumen-kw-warn' },
  { word: 'NOTE',    cls: 'lumen-kw-note' },
  { word: 'INFO',    cls: 'lumen-kw-note' },
  { word: 'TIP',     cls: 'lumen-kw-tip' },
  { word: 'IMPORTANT', cls: 'lumen-kw-warn' },
]

/**
 * Decore les mots-cles pedagogiques (TODO, NOTE, etc.) avec un span.
 * Parcourt uniquement les noeuds texte hors <pre><code> pour ne pas
 * toucher au code source colorise par highlight.js.
 */
function highlightKeywords(html: string): string {
  // On repere les blocs <pre>...</pre> pour les exclure : on les remplace
  // temporairement par des placeholders, on decore le reste, puis on
  // restore. Simple et side-effect-free.
  const placeholders: string[] = []
  const withoutCode = html.replace(/<pre[\s\S]*?<\/pre>/g, (match) => {
    const id = placeholders.length
    placeholders.push(match)
    return `\u0000PRE_${id}\u0000`
  })
  // Applique les remplacements sequentiellement
  let decorated = withoutCode
  for (const { word, cls } of KEYWORD_PATTERNS) {
    // \b ne marche pas sur les ":", on ajoute explicitement le ":" optionnel
    const re = new RegExp(`\\b(${word})\\b(:?)`, 'g')
    decorated = decorated.replace(re, `<span class="lumen-kw ${cls}">$1$2</span>`)
  }
  // Restore les blocs <pre>
  decorated = decorated.replace(/\u0000PRE_(\d+)\u0000/g, (_, id) => placeholders[Number(id)] ?? '')
  return decorated
}

// Allowlist explicite : seules ces balises peuvent passer le sanitiseur.
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr', 'span', 'div',
  'strong', 'em', 'del', 's', 'sub', 'sup',
  'ul', 'ol', 'li',
  'blockquote',
  'pre', 'code',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
]

const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'class', 'id',
  'target', 'rel',
  'colspan', 'rowspan',
]

// Force rel="noopener noreferrer" sur tous les liens externes pour eviter window.opener leak
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    const el = node as HTMLAnchorElement
    if (el.getAttribute('target')) {
      el.setAttribute('rel', 'noopener noreferrer')
    }
  }
})

/**
 * Convertit un markdown en HTML sanitise (allowlist + force rel noopener).
 * DOMPurify retire automatiquement les protocoles dangereux (javascript:, data:).
 */
export function renderMarkdown(md: string): string {
  if (!md) return ''
  const rawHtml = marked.parse(md, { async: false }) as string
  const withIds = injectHeadingIds(rawHtml)
  const withKeywords = highlightKeywords(withIds)
  return DOMPurify.sanitize(withKeywords, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  })
}
