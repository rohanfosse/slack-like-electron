/**
 * useMessagesSearch : recherche + filtres avances (dates, has file) sur
 * les messages du canal / DM courant. La recherche server-side ne
 * supportant pas les plages de date, on applique les filtres client-side
 * apres fetch.
 */
import { ref, computed } from 'vue'
import { useMessagesStore } from '@/stores/messages'
import type { Message } from '@/types'

type MessageWithFile = Message & { file_url?: string }

export function useMessagesSearch() {
  const messagesStore = useMessagesStore()

  const input = ref('')
  const filterOpen = ref(false)
  const dateFrom = ref('')
  const dateTo = ref('')
  const hasFile = ref(false)

  const hasActiveFilters = computed(() =>
    !!dateFrom.value || !!dateTo.value || hasFile.value,
  )

  function applyClientFilters() {
    let filtered = [...messagesStore.messages]
    if (dateFrom.value) {
      const from = new Date(dateFrom.value).getTime()
      filtered = filtered.filter((m) => new Date(m.created_at).getTime() >= from)
    }
    if (dateTo.value) {
      const to = new Date(dateTo.value).getTime() + 86400000
      filtered = filtered.filter((m) => new Date(m.created_at).getTime() <= to)
    }
    if (hasFile.value) {
      filtered = filtered.filter((m) => {
        const mf = m as MessageWithFile
        return mf.file_url || m.content?.includes('[fichier]') || m.content?.includes('**')
      })
    }
    messagesStore.messages = filtered
  }

  async function doSearch() {
    messagesStore.searchTerm = input.value
    await messagesStore.fetchMessages()
    if (dateFrom.value || dateTo.value || hasFile.value) applyClientFilters()
  }

  function clearSearch() {
    input.value = ''
    dateFrom.value = ''
    dateTo.value = ''
    hasFile.value = false
    filterOpen.value = false
    messagesStore.clearSearch()
    messagesStore.fetchMessages()
  }

  return {
    input, filterOpen, dateFrom, dateTo, hasFile,
    hasActiveFilters,
    doSearch, clearSearch, applyClientFilters,
  }
}
