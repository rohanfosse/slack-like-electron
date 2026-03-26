// ─── Composable pour normaliser les appels API avec retry & gestion d'erreurs ─
import { useToast } from './useToast'

interface ApiResult<T = unknown> {
  ok: boolean
  data?: T | null
  error?: string
}

interface ApiOptions {
  /** Contexte d'erreur (clé dans ERROR_CONTEXT) */
  context?: string
  /** Nombre de tentatives en cas d'erreur réseau (défaut 0 = pas de retry) */
  retries?: number
  /** Afficher un toast en cas d'erreur (défaut true) */
  silent?: boolean
}

/**
 * Messages d'erreur contextualisés par domaine.
 */
const ERROR_CONTEXT: Record<string, { msg: string; detail?: string }> = {
  // Messages
  'send':     { msg: 'Impossible d\'envoyer le message.',                detail: 'Vérifiez votre connexion et réessayez.' },
  'edit':     { msg: 'Impossible de modifier le message.',               detail: 'Le message a peut-être été supprimé entre-temps.' },
  'delete':   { msg: 'Impossible de supprimer le message.',              detail: 'Vous ne pouvez supprimer que vos propres messages.' },
  'pin':      { msg: 'Impossible d\'épingler le message.',               detail: 'Limite de 5 messages épinglés par canal atteinte.' },
  'search':   { msg: 'La recherche a échoué.',                           detail: 'Essayez avec des termes plus courts ou différents.' },
  'reaction': { msg: 'Impossible d\'ajouter la réaction.',               detail: 'Le message a peut-être été supprimé.' },
  // Documents
  'upload':   { msg: 'Échec de l\'envoi du fichier.',                    detail: 'Vérifiez la taille (max 50 Mo) et le format du fichier.' },
  'download': { msg: 'Impossible de télécharger le fichier.',            detail: 'Le fichier a peut-être été déplacé ou supprimé.' },
  'doc':      { msg: 'Erreur lors de l\'opération sur le document.',     detail: 'Vérifiez vos permissions et réessayez.' },
  // Devoirs
  'submit':   { msg: 'Impossible de soumettre le rendu.',                detail: 'Vérifiez que la deadline n\'est pas dépassée et que le fichier est valide.' },
  'grade':    { msg: 'Impossible d\'enregistrer la note.',               detail: 'Vérifiez que le format de note est correct (A-F ou numérique).' },
  'feedback': { msg: 'Impossible d\'enregistrer le feedback.',           detail: 'Le texte est peut-être trop long (max 5 000 caractères).' },
  'devoir':   { msg: 'Erreur lors de l\'opération sur le devoir.',       detail: 'Vérifiez les champs requis et réessayez.' },
  // Signatures
  'signature': { msg: 'Erreur lors de l\'opération de signature.',       detail: 'Vérifiez que le document est toujours accessible.' },
  'sign':      { msg: 'Impossible de signer le document.',               detail: 'Le fichier a peut-être été modifié depuis la demande.' },
  // Structure
  'channel':  { msg: 'Erreur lors de l\'opération sur le canal.',        detail: 'Le canal a peut-être été supprimé.' },
  'promo':    { msg: 'Erreur lors de l\'opération sur la promotion.',    detail: 'Vérifiez que la promotion existe toujours.' },
  'group':    { msg: 'Erreur lors de l\'opération sur le groupe.',       detail: 'Le groupe a peut-être été modifié.' },
  // Auth
  'login':    { msg: 'Échec de la connexion.',                           detail: 'Vérifiez votre email et votre mot de passe.' },
  'register': { msg: 'Échec de la création du compte.',                  detail: 'Vérifiez les informations saisies.' },
  'password': { msg: 'Impossible de changer le mot de passe.',           detail: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.' },
  // Permissions
  'forbidden': { msg: 'Action non autorisée.',                           detail: 'Vous n\'avez pas les permissions nécessaires pour cette action.' },
  // Network
  'network':  { msg: 'Impossible de contacter le serveur.',              detail: 'Vérifiez votre connexion internet et réessayez.' },
  'timeout':  { msg: 'Le serveur met trop de temps à répondre.',         detail: 'Réessayez dans quelques instants.' },
  'offline':  { msg: 'Vous êtes hors ligne.',                            detail: 'L\'action sera réessayée automatiquement à la reconnexion.' },
}

function detectErrorContext(serverMsg: string): string | null {
  const lower = serverMsg.toLowerCase()
  if (lower.includes('autoris') || lower.includes('permission') || lower.includes('interdit') || lower.includes('403')) return 'forbidden'
  if (lower.includes('session') || lower.includes('token') || lower.includes('authentif')) return 'login'
  if (lower.includes('promo')) return 'promo'
  if (lower.includes('canal') || lower.includes('channel')) return 'channel'
  if (lower.includes('signature') || lower.includes('signer')) return 'signature'
  return null
}

function isNetworkError(msg: string): boolean {
  return ['fetch', 'network', 'Failed', 'ECONNREFUSED', 'ERR_CONNECTION', 'Load failed'].some(k => msg.includes(k))
}

/** Attente avec backoff exponentiel (200ms, 400ms, 800ms...) */
function backoff(attempt: number): Promise<void> {
  return new Promise(r => setTimeout(r, Math.min(200 * 2 ** attempt, 5000)))
}

/**
 * Helper pour les appels API avec retry automatique et gestion d'erreurs uniforme.
 *
 * Usage :
 *   const { api } = useApi()
 *   const data = await api(() => window.api.sendMessage(payload), 'send')
 *   // Avec retry :
 *   const data = await api(() => window.api.loadData(), { context: 'search', retries: 2 })
 */
export function useApi() {
  const { showToast } = useToast()

  async function api<T>(
    call: () => Promise<ApiResult<T>>,
    optionsOrContext?: string | ApiOptions,
  ): Promise<T | null> {
    const opts: ApiOptions = typeof optionsOrContext === 'string'
      ? { context: optionsOrContext }
      : optionsOrContext ?? {}
    const { context, retries = 0, silent = false } = opts

    // Vérification offline avant d'appeler
    if (!navigator.onLine) {
      if (!silent) showToast(ERROR_CONTEXT['offline'].msg, 'error', ERROR_CONTEXT['offline'].detail)
      return null
    }

    let lastError: unknown = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await call()
        if (!res?.ok) {
          // Erreur serveur — pas de retry (c'est une erreur métier, pas réseau)
          if (!silent) {
            const serverError = res?.error || ''
            const ctx = context ? ERROR_CONTEXT[context] : null
            const autoCtx = serverError ? ERROR_CONTEXT[detectErrorContext(serverError) ?? ''] : null
            const msg = serverError || ctx?.msg || 'Une erreur est survenue.'
            const detail = ctx?.detail || autoCtx?.detail || undefined
            showToast(msg, 'error', detail)
          }
          return null
        }
        return (res.data ?? null) as T | null
      } catch (err: unknown) {
        lastError = err
        const message = (err as Error)?.message ?? ''

        // Retry uniquement sur erreur réseau
        if (isNetworkError(message) && attempt < retries) {
          await backoff(attempt)
          continue
        }

        // Dernière tentative échouée — afficher l'erreur
        if (!silent) {
          if (isNetworkError(message)) {
            const retryMsg = retries > 0 ? ` (${retries + 1} tentatives échouées)` : ''
            showToast(ERROR_CONTEXT['network'].msg + retryMsg, 'error', ERROR_CONTEXT['network'].detail)
          } else if (message.includes('timeout') || message.includes('abort')) {
            showToast(ERROR_CONTEXT['timeout'].msg, 'error', ERROR_CONTEXT['timeout'].detail)
          } else {
            const ctx = context ? ERROR_CONTEXT[context] : null
            showToast(
              ctx?.msg || message || 'Erreur inattendue.',
              'error',
              ctx?.detail || (message ? `Détail : ${message}` : undefined),
            )
          }
        }
        return null
      }
    }

    return null
  }

  return { api, ERROR_CONTEXT }
}
