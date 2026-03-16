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

// ─── Formatage du contenu d'un message ───────────────────────────────────────

export function renderMessageContent(raw: string, searchTerm = '', currentUserName = ''): string {
  const escaped = searchTerm ? highlightTerm(raw, searchTerm) : escapeHtml(raw)
  return applyMentions(parseMarkdown(escaped), currentUserName)
}
