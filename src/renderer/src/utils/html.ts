// ─── Sécurité HTML ──────────────────────────────────────────────────────────

export function escapeHtml(str: string | null | undefined): string {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Met en évidence les occurrences d'un terme dans un texte
export function highlightTerm(text: string, term: string): string {
  if (!term) return escapeHtml(text)
  const escaped  = escapeHtml(text)
  const escapedT = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return escaped.replace(
    new RegExp(escapedT, 'gi'),
    (m) => `<mark class="search-highlight">${m}</mark>`,
  )
}

// ─── Markdown inline ─────────────────────────────────────────────────────────

export function parseMarkdown(html: string): string {
  return html
    .replace(/\*\*(.*?)\*\*/g,  '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,       '<em>$1</em>')
    .replace(/`(.*?)`/g,         '<code class="inline-code">$1</code>')
}

// ─── Mentions ────────────────────────────────────────────────────────────────

export function applyMentions(html: string, currentUserName = ''): string {
  // Correspondance "@prenom.nom", "@mot" ou "@everyone"
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
  // Vérifie si le prénom ou le nom complet est mentionné
  const parts = userName.toLowerCase().split(/\s+/)
  return parts.some((p) => text.toLowerCase().includes('@' + p))
}

// ─── Liens cliquables ────────────────────────────────────────────────────────

/** Transforme les URLs brutes en <a data-url="..."> dans du HTML déjà échappé. */
function linkifyHtml(html: string): string {
  return html.replace(/https?:\/\/[^\s<>"]+/gi, (url) => {
    // Retire la ponctuation finale qui ne fait probablement pas partie de l'URL
    const trimmed = url.replace(/[.,;:!?)\]]+$/, '')
    const tail    = url.slice(trimmed.length)
    return `<a class="msg-link" data-url="${trimmed}" href="#" tabindex="0">${trimmed}</a>${tail}`
  })
}

// ─── Formatage du contenu d'un message ───────────────────────────────────────

export function renderMessageContent(raw: string, searchTerm = '', currentUserName = ''): string {
  const escaped = searchTerm ? highlightTerm(raw, searchTerm) : escapeHtml(raw)
  return linkifyHtml(applyMentions(parseMarkdown(escaped), currentUserName))
}
