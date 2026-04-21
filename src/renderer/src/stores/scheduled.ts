import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'

export interface ScheduledMessage {
  id: number
  channel_id: number | null
  channel_name: string | null
  channel_promo_id: number | null
  dm_student_id: number | null
  dm_peer_id: number | null
  dm_peer_name: string | null
  author_id: number
  author_name: string
  author_type: 'student' | 'teacher'
  content: string
  reply_to_id: number | null
  reply_to_author: string | null
  reply_to_preview: string | null
  attachments_json: string | null
  send_at: string
  sent: number
  failed_at: string | null
  error: string | null
  created_at: string
}

export interface SchedulePayload {
  channelId?: number | null
  dmStudentId?: number | null
  dmPeerId?: number | null
  content: string
  sendAt: string
  replyToId?: number | null
  replyToAuthor?: string | null
  replyToPreview?: string | null
}

/**
 * Store global des messages programmes.
 *
 * Un seul fetch initial au login, partage entre MessageInput (banner au-dessus
 * de la barre de saisie) et ScheduledMessagesModal (gestion complete).
 */
export const useScheduledStore = defineStore('scheduled', () => {
  const { api } = useApi()
  const { showToast } = useToast()

  const items   = ref<ScheduledMessage[]>([])
  const loading = ref(false)
  const loaded  = ref(false)

  const pendingCount = computed(() => items.value.filter(m => !m.sent && !m.failed_at).length)
  const failedCount  = computed(() => items.value.filter(m => m.failed_at).length)

  /** Compte les programmations encore en attente dans un contexte donne. */
  function countForContext(opts: { channelId?: number | null; dmStudentId?: number | null }): number {
    return items.value.filter(m => {
      if (m.sent || m.failed_at) return false
      if (opts.channelId != null) return m.channel_id === opts.channelId
      if (opts.dmStudentId != null) return m.dm_student_id === opts.dmStudentId
      return false
    }).length
  }

  async function load(force = false): Promise<void> {
    if (loaded.value && !force) return
    loading.value = true
    const res = await api(() => window.api.listScheduledMessages(), { silent: true })
    if (res) { items.value = res; loaded.value = true }
    loading.value = false
  }

  async function create(payload: SchedulePayload): Promise<boolean> {
    const res = await api(() => window.api.createScheduledMessage(payload), { context: 'send' })
    if (res) {
      showToast('Message programmé.', 'success')
      await load(true)
      return true
    }
    return false
  }

  async function update(id: number, payload: { content?: string; sendAt?: string }): Promise<boolean> {
    const res = await api(() => window.api.updateScheduledMessage(id, payload), { context: 'edit' })
    if (res) { await load(true); return true }
    return false
  }

  async function remove(id: number): Promise<boolean> {
    items.value = items.value.filter(m => m.id !== id)
    const res = await api(() => window.api.deleteScheduledMessage(id), { context: 'delete' })
    if (res) { showToast('Message programmé supprimé.', 'info'); return true }
    await load(true)
    return false
  }

  function reset(): void {
    items.value = []
    loading.value = false
    loaded.value = false
  }

  return {
    items, loading, loaded, pendingCount, failedCount,
    countForContext, load, create, update, remove, reset,
  }
})
