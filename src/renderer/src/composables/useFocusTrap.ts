/**
 * Piège le focus clavier à l'intérieur d'un conteneur (modal, dialog).
 * Utilisé par BaseModal.vue et les composants modaux.
 */
import { ref, watch, nextTick, onUnmounted, type Ref } from 'vue'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ')

/** Vérifie qu'un élément est réellement visible (fallback jsdom). */
function isVisible(el: HTMLElement): boolean {
  // API moderne (Chrome 105+, Firefox 125+)
  const maybeCheck = (el as HTMLElement & { checkVisibility?: () => boolean }).checkVisibility
  if (typeof maybeCheck === 'function') {
    try { return maybeCheck.call(el) } catch { /* fallthrough */ }
  }
  // Fallback : `position: fixed` a offsetParent null, donc on combine
  if (el.offsetParent !== null) return true
  return el.getClientRects().length > 0
}

/** Focus sécurisé : ignore les erreurs de DOM détaché / iframe. */
function safeFocus(el: HTMLElement | null | undefined): void {
  if (!el) return
  try { el.focus() } catch { /* noop */ }
}

/**
 * Piège le focus à l'intérieur d'un conteneur (modal, dialog, etc.).
 * Gère Tab / Shift+Tab pour cycler entre les éléments focusables.
 */
export function useFocusTrap(
  containerRef: Ref<HTMLElement | null>,
  active: Ref<boolean>,
) {
  const previouslyFocused = ref<HTMLElement | null>(null)
  let listening = false

  function getFocusable(): HTMLElement[] {
    const container = containerRef.value
    if (!container) return []
    const all = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    return all.filter(isVisible)
  }

  function pickInitialFocus(elements: HTMLElement[]): HTMLElement | null {
    if (!elements.length) return null
    const container = containerRef.value
    if (container) {
      const preferred = container.querySelector<HTMLElement>('[autofocus], [data-autofocus]')
      if (preferred && elements.includes(preferred)) return preferred
    }
    return elements[0]
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return
    const container = containerRef.value
    // Si le conteneur a disparu ou n'est plus dans le DOM, on laisse passer
    if (!container || !document.contains(container)) return

    const elements = getFocusable()
    if (!elements.length) return

    const first = elements[0]
    const last = elements[elements.length - 1]
    const activeEl = document.activeElement as HTMLElement | null

    // Si le focus a quitté le conteneur (clic extérieur, etc.), on le ramène.
    // Guard : uniquement si l'activeElement n'est nulle part (body) ou hors conteneur actif.
    if (activeEl && activeEl !== document.body && !container.contains(activeEl)) {
      e.preventDefault()
      safeFocus(e.shiftKey ? last : first)
      return
    }

    if (e.shiftKey) {
      if (activeEl === first) {
        e.preventDefault()
        safeFocus(last)
      }
    } else {
      if (activeEl === last) {
        e.preventDefault()
        safeFocus(first)
      }
    }
  }

  function attach(): void {
    if (listening) return
    document.addEventListener('keydown', onKeydown)
    listening = true
  }

  function detach(): void {
    if (!listening) return
    document.removeEventListener('keydown', onKeydown)
    listening = false
  }

  watch(active, async (isActive) => {
    if (isActive) {
      previouslyFocused.value = document.activeElement as HTMLElement | null
      await nextTick()
      const elements = getFocusable()
      safeFocus(pickInitialFocus(elements))
      attach()
    } else {
      detach()
      const target = previouslyFocused.value
      // Ne restaure que si l'élément est toujours dans le DOM
      if (target && document.contains(target)) {
        safeFocus(target)
      }
      previouslyFocused.value = null
    }
  }, { immediate: true })

  onUnmounted(() => {
    detach()
    previouslyFocused.value = null
  })
}
