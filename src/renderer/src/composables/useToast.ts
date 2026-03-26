/**
 * Système de toast global (singleton) : affichage de notifications temporaires (error, success, info, undo).
 * Les erreurs restent affichées 8s (au lieu de 4s) et peuvent être fermées manuellement.
 */
import { reactive } from 'vue'

// ─── État partagé (singleton) ────────────────────────────────────────────────

export type ToastType = 'error' | 'success' | 'info' | 'undo'

interface ToastState {
  message: string
  type: ToastType
  visible: boolean
  detail?: string
  onUndo?: () => void
}

export const toastState = reactive<ToastState>({
  message: '',
  type: 'error',
  visible: false,
  detail: undefined,
})

let _timer: ReturnType<typeof setTimeout> | null = null

// ─── Composable ──────────────────────────────────────────────────────────────

export function useToast() {
  function showToast(msg: string, type: Exclude<ToastType, 'undo'> = 'error', detail?: string) {
    if (_timer) clearTimeout(_timer)
    toastState.message = msg
    toastState.type    = type
    toastState.visible = true
    toastState.detail  = detail
    toastState.onUndo  = undefined
    // Erreurs : 8s. Succès/Info : 4s.
    const duration = type === 'error' ? 8000 : 4000
    _timer = setTimeout(() => { toastState.visible = false }, duration)
  }

  function dismissToast() {
    if (_timer) clearTimeout(_timer)
    toastState.visible = false
  }

  function showUndoToast(msg: string, duration = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      if (_timer) clearTimeout(_timer)
      toastState.message = msg
      toastState.type    = 'undo'
      toastState.visible = true
      toastState.detail  = undefined
      let settled = false

      toastState.onUndo = () => {
        if (settled) return
        settled = true
        if (_timer) clearTimeout(_timer)
        toastState.visible = false
        resolve(true)
      }

      _timer = setTimeout(() => {
        if (!settled) { settled = true; toastState.visible = false; resolve(false) }
      }, duration)
    })
  }

  return { showToast, showUndoToast, dismissToast }
}
