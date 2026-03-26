// ─── Composable pour normaliser les appels API et la gestion d'erreurs ─────
import { useToast } from './useToast'

interface ApiResult<T = unknown> {
  ok: boolean
  data?: T | null
  error?: string
}

/**
 * Messages d'erreur contextualisés par domaine.
 * Chaque entrée contient un message principal et un détail technique.
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
}

/**
 * Détecte le contexte d'erreur à partir du message serveur.
 */
function detectErrorContext(serverMsg: string): string | null {
  const lower = serverMsg.toLowerCase()
  if (lower.includes('autoris') || lower.includes('permission') || lower.includes('interdit') || lower.includes('403')) return 'forbidden'
  if (lower.includes('session') || lower.includes('token') || lower.includes('authentif')) return 'login'
  if (lower.includes('promo')) return 'promo'
  if (lower.includes('canal') || lower.includes('channel')) return 'channel'
  if (lower.includes('signature') || lower.includes('signer')) return 'signature'
  return null
}

/**
 * Helper pour les appels API avec gestion d'erreurs uniforme.
 *
 * Usage :
 *   const { api } = useApi()
 *   const data = await api(() => window.api.sendMessage(payload), 'send')
 */
export function useApi() {
  const { showToast } = useToast()

  async function api<T>(
    call: () => Promise<ApiResult<T>>,
    context?: string,
  ): Promise<T | null> {
    try {
      const res = await call()
      if (!res?.ok) {
        const serverError = res?.error || ''
        const ctx = context ? ERROR_CONTEXT[context] : null
        const autoCtx = serverError ? ERROR_CONTEXT[detectErrorContext(serverError) ?? ''] : null

        // Message principal : serveur d'abord, puis contexte, puis générique
        const msg = serverError || ctx?.msg || 'Une erreur est survenue.'
        // Détail technique : contexte d'abord, puis auto-détection
        const detail = ctx?.detail || autoCtx?.detail || undefined

        showToast(msg, 'error', detail)
        return null
      }
      return (res.data ?? null) as T | null
    } catch (err: unknown) {
      const message = (err as Error)?.message ?? ''
      if (message.includes('fetch') || message.includes('network') || message.includes('Failed') || message.includes('ECONNREFUSED')) {
        showToast(ERROR_CONTEXT['network'].msg, 'error', ERROR_CONTEXT['network'].detail)
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
      return null
    }
  }

  return { api, ERROR_CONTEXT }
}
