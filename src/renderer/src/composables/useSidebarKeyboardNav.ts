/**
 * useSidebarKeyboardNav : navigation clavier (fleches haut/bas) dans la
 * liste des canaux et DMs de la sidebar.
 */
export function useSidebarKeyboardNav() {
  function onKeydown(ev: KeyboardEvent) {
    if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return
    ev.preventDefault()
    const items = document.querySelectorAll<HTMLElement>(
      '.sidebar-scroll-list .sidebar-item, .sidebar-scroll-list .channel-drag-wrap [role="button"]',
    )
    if (!items.length) return
    const active = document.activeElement as HTMLElement | null
    const currentIdx = active ? [...items].indexOf(active) : -1
    let nextIdx: number
    if (ev.key === 'ArrowDown') {
      nextIdx = currentIdx < items.length - 1 ? currentIdx + 1 : 0
    } else {
      nextIdx = currentIdx > 0 ? currentIdx - 1 : items.length - 1
    }
    items[nextIdx]?.focus()
  }

  return { onKeydown }
}
