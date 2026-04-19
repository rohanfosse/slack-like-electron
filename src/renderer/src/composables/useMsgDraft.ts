/**
 * Sauvegarde et restauration des brouillons de message par canal/DM via localStorage.
 * Used by MessageInput.vue
 */
import { ref, computed, watch, nextTick, onUnmounted, getCurrentInstance, type Ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { renderMessageContent } from '@/utils/html'

const DRAFT_DEBOUNCE_MS = 500

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key) }
  catch { return null }
}

function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value) }
  catch { /* quota dépassé / stockage indisponible : on ignore, pas d'erreur UI pour un draft */ }
}

function safeRemove(key: string): void {
  try { localStorage.removeItem(key) }
  catch { /* idem */ }
}

function keyFor(channelId: number | null | undefined, dmStudentId: number | null | undefined): string | null {
  if (channelId)   return `draft_ch_${channelId}`
  if (dmStudentId) return `draft_dm_${dmStudentId}`
  return null
}

/**
 * Draft auto-save par canal/DM + toggle de prévisualisation markdown.
 *
 * Robustesse :
 *  - Les brouillons en cours de frappe sont **flushés** vers l'ancien canal
 *    avant chargement du nouveau (pas de perte au switch rapide).
 *  - Les erreurs localStorage (quota, mode privé) sont avalées silencieusement.
 *  - Timer et watcher sont nettoyés à l'unmount.
 */
export function useMsgDraft(
  content: Ref<string>,
  inputEl: Ref<HTMLTextAreaElement | null>,
  autoResize: () => void,
) {
  const appStore = useAppStore()

  const showPreview = ref(false)
  const previewHtml = computed(() => showPreview.value ? renderMessageContent(content.value) : '')

  // ── Brouillons (auto-save localStorage) ──────────────────────────────────
  let draftTimer: ReturnType<typeof setTimeout> | null = null

  const draftKey = computed(() => keyFor(appStore.activeChannelId, appStore.activeDmStudentId))

  function writeDraft(key: string, value: string): void {
    if (value.trim()) safeSet(key, value)
    else              safeRemove(key)
  }

  function saveDraft(): void {
    if (draftTimer) { clearTimeout(draftTimer); draftTimer = null }
    const key = draftKey.value
    if (!key) return
    writeDraft(key, content.value)
  }

  function clearDraft(): void {
    if (draftTimer) { clearTimeout(draftTimer); draftTimer = null }
    const key = draftKey.value
    if (key) safeRemove(key)
  }

  function scheduleDraftSave(): void {
    if (draftTimer) clearTimeout(draftTimer)
    draftTimer = setTimeout(() => {
      draftTimer = null
      saveDraft()
    }, DRAFT_DEBOUNCE_MS)
  }

  // Restaurer le brouillon quand le canal change
  const stopWatch = watch(
    () => [appStore.activeChannelId, appStore.activeDmStudentId] as const,
    (_newVals, oldVals) => {
      // 1) Flush du save en attente vers l'ANCIEN canal (préserve la frappe en cours)
      if (draftTimer) {
        clearTimeout(draftTimer)
        draftTimer = null
        const [oldCh, oldDm] = oldVals ?? [null, null]
        const oldKey = keyFor(oldCh, oldDm)
        if (oldKey) writeDraft(oldKey, content.value)
      }
      // 2) Charger le brouillon du NOUVEAU canal
      const key = draftKey.value
      content.value = key ? (safeGet(key) ?? '') : ''
      nextTick(() => {
        autoResize()
        inputEl.value?.focus()
      })
    },
  )

  if (getCurrentInstance()) {
    onUnmounted(() => {
      // Flush final : préserve tout draft en cours de frappe
      if (draftTimer) {
        clearTimeout(draftTimer)
        draftTimer = null
        const key = draftKey.value
        if (key) writeDraft(key, content.value)
      }
      stopWatch()
    })
  }

  return {
    showPreview,
    previewHtml,
    clearDraft,
    scheduleDraftSave,
    saveDraft,
  }
}
