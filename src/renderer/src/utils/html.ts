import { marked } from 'marked'
import hljs from 'highlight.js'

// ─── Sécurité HTML ───────────────────────────────────────────────────────────

export function escapeHtml(str: string | null | undefined): string {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── Configuration marked (singleton) ────────────────────────────────────────

marked.use({
  breaks: true,
  gfm: true,
  renderer: {
    // Liens : data-url pour l'interception click existante dans MessageBubble
    link({ href, tokens }: { href: string; title?: string | null; tokens: unknown[] }) {
      const text = (this as any).parser.parseInline(tokens)
      const safe = escapeHtml(href ?? '')
      return `<a class="msg-link" data-url="${safe}" href="#" tabindex="0">${text}</a>`
    },
    // Blocs de code : coloration syntaxique via highlight.js
    code({ text, lang }: { text: string; lang?: string; escaped?: boolean }) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
      const highlighted = hljs.highlight(text, { language }).value
      const langLabel = escapeHtml(lang || 'code')
      return (
        `<div class="code-block">` +
        `<span class="code-lang">${langLabel}</span>` +
        `<pre><code class="hljs language-${escapeHtml(language)}">${highlighted}</code></pre>` +
        `</div>`
      )
    },
  },
})

// ─── Mentions ────────────────────────────────────────────────────────────────

export function applyMentions(html: string, currentUserName = ''): string {
  return html.replace(/@([\w][\w.\-]*)/g, (match, name) => {
    const isEveryone = name.toLowerCase() === 'everyone'
    const isMine =
      !isEveryone &&
      !!currentUserName &&
      currentUserName.toLowerCase().includes(name.toLowerCase())
    const cls = isEveryone || isMine ? 'mention-me' : 'mention-tag'
    return `<span class="${cls}">${match}</span>`
  })
}

export function hasMention(text: string, userName: string): boolean {
  if (/@everyone\b/i.test(text)) return true
  if (!userName) return false
  const parts = userName.toLowerCase().split(/\s+/)
  return parts.some((p) => text.toLowerCase().includes('@' + p))
}

// ─── Mise en évidence du terme de recherche (texte seulement) ────────────────

function highlightInHtml(html: string, term: string): string {
  if (!term) return html
  const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  // Traite uniquement les nœuds texte (ignore les balises HTML)
  return html.replace(/<[^>]*>|[^<]+/g, (part) => {
    if (part.startsWith('<')) return part
    return part.replace(re, (m) => `<mark class="search-highlight">${m}</mark>`)
  })
}

// ─── Formatage du contenu d'un message ───────────────────────────────────────

export function renderMessageContent(raw: string, searchTerm = '', currentUserName = ''): string {
  let html = marked.parse(raw) as string
  html = applyMentions(html, currentUserName)
  if (searchTerm) html = highlightInHtml(html, searchTerm)
  return html
}
