// ─── Composable de confirmation asynchrone ──────────────────────────────────
// Usage (signature courte) : const ok = await confirm('Supprimer ce canal ?', 'danger')
// Usage (options)          : const ok = await confirm({ message: '...', variant: 'warning', confirmLabel: '...' })
//
// Singleton : un seul dialog affichable à la fois. Si un nouvel appel arrive
// alors qu'une confirmation est déjà visible, la précédente est résolue à `false`
// (équivalent "annulé") pour éviter toute Promise orpheline.

import { ref } from 'vue'

export type ConfirmVariant = 'danger' | 'warning' | 'info'

export interface ConfirmOptions {
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
}

const visible = ref(false)
const options = ref<ConfirmOptions>({ message: '' })
let resolver: ((v: boolean) => void) | null = null

function doResolve(value: boolean): void {
  const r = resolver
  resolver = null
  visible.value = false
  if (r) r(value)
}

export function useConfirm() {
  function confirm(
    messageOrOpts: string | ConfirmOptions,
    variant: ConfirmVariant = 'danger',
    confirmLabel?: string,
  ): Promise<boolean> {
    // Si un confirm précédent est toujours en cours, on l'annule (résout à false)
    // pour éviter une Promise orpheline qui ne se résoudrait jamais.
    if (resolver) doResolve(false)

    const opts: ConfirmOptions = typeof messageOrOpts === 'string'
      ? { message: messageOrOpts, variant, confirmLabel }
      : { variant: 'danger', ...messageOrOpts }

    options.value = opts
    visible.value = true

    return new Promise<boolean>((resolve) => { resolver = resolve })
  }

  function resolve(value: boolean): void {
    doResolve(value)
  }

  /** Sucre : équivalent à `resolve(false)`. */
  function cancel(): void {
    doResolve(false)
  }

  return { visible, options, confirm, resolve, cancel }
}
