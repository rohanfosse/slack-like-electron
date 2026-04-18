/**
 * useChapterSearch : find-in-page local dans le body du chapitre rendu.
 *
 * Highlights via <mark.lumen-find-hl> + navigation suivant/precedent.
 * Intercepte Ctrl+F / Cmd+F pour ouvrir la barre; Esc pour fermer.
 */
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'

export function useChapterSearch(bodyRef: Ref<HTMLElement | null>) {
  const open = ref(false)
  const query = ref('')
  const count = ref(0)
  const current = ref(0)
  const inputRef = ref<HTMLInputElement | null>(null)

  function openSearch() {
    open.value = true
    nextTick(() => {
      inputRef.value?.focus()
      inputRef.value?.select()
    })
  }

  function closeSearch() {
    open.value = false
    query.value = ''
    clearHighlights()
  }

  function clearHighlights() {
    if (!bodyRef.value) return
    const marks = bodyRef.value.querySelectorAll('mark.lumen-find-hl')
    marks.forEach((m) => {
      const parent = m.parentNode
      if (parent) {
        parent.replaceChild(document.createTextNode(m.textContent ?? ''), m)
        parent.normalize()
      }
    })
    count.value = 0
    current.value = 0
  }

  function highlightMatches() {
    clearHighlights()
    const q = query.value.trim().toLowerCase()
    if (!q || !bodyRef.value) return
    const walker = document.createTreeWalker(bodyRef.value, NodeFilter.SHOW_TEXT)
    const nodes: { node: Text; index: number }[] = []
    let textNode: Text | null
    while ((textNode = walker.nextNode() as Text | null)) {
      const text = textNode.textContent ?? ''
      let idx = text.toLowerCase().indexOf(q)
      while (idx !== -1) {
        nodes.push({ node: textNode, index: idx })
        idx = text.toLowerCase().indexOf(q, idx + q.length)
      }
    }
    for (let i = nodes.length - 1; i >= 0; i--) {
      const { node, index } = nodes[i]
      try {
        const range = document.createRange()
        range.setStart(node, index)
        range.setEnd(node, index + q.length)
        const mark = document.createElement('mark')
        mark.className = 'lumen-find-hl'
        range.surroundContents(mark)
      } catch {
        // surroundContents throws when range crosses element boundaries
      }
    }
    count.value = nodes.length
    current.value = nodes.length > 0 ? 1 : 0
    scrollToCurrent()
  }

  function scrollToCurrent() {
    if (!bodyRef.value || count.value === 0) return
    const marks = bodyRef.value.querySelectorAll('mark.lumen-find-hl')
    marks.forEach((m) => m.classList.remove('lumen-find-hl--active'))
    const idx = current.value - 1
    if (idx >= 0 && idx < marks.length) {
      marks[idx].classList.add('lumen-find-hl--active')
      marks[idx].scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  function findNext() {
    if (count.value === 0) return
    current.value = current.value >= count.value ? 1 : current.value + 1
    scrollToCurrent()
  }

  function findPrev() {
    if (count.value === 0) return
    current.value = current.value <= 1 ? count.value : current.value - 1
    scrollToCurrent()
  }

  watch(query, () => highlightMatches())

  function onGlobalKeydown(ev: KeyboardEvent) {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'f') {
      ev.preventDefault()
      openSearch()
    }
    if (ev.key === 'Escape' && open.value) closeSearch()
  }

  onMounted(() => document.addEventListener('keydown', onGlobalKeydown))
  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onGlobalKeydown)
    closeSearch()
  })

  return { open, query, count, current, inputRef, openSearch, closeSearch, findNext, findPrev }
}
