import { ref, computed } from 'vue'
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
 * Composable global pour les messages programmes.
 * Le meme composable est utilise par le modal de programmation et par la
 * vue de gestion des messages programmes.
 */
export function useScheduledMessages() {
  const { api } = useApi()
  const { showToast } = useToast()

  const items   = ref<ScheduledMessage[]>([])
  const loading = ref(false)

  const pendingCount = computed(() => items.value.filter(m => !m.sent && !m.failed_at).length)
  const failedCount  = computed(() => items.value.filter(m => m.failed_at).length)

  async function load(): Promise<void> {
    loading.value = true
    const res = await api(() => window.api.listScheduledMessages(), { context: 'search' })
    if (res) items.value = res
    loading.value = false
  }

  async function create(payload: SchedulePayload): Promise<boolean> {
    const res = await api(
      () => window.api.createScheduledMessage(payload),
      { context: 'send' },
    )
    if (res) {
      showToast('Message programmé.', 'success')
      await load()
      return true
    }
    return false
  }

  async function update(id: number, payload: { content?: string; sendAt?: string }): Promise<boolean> {
    const res = await api(
      () => window.api.updateScheduledMessage(id, payload),
      { context: 'edit' },
    )
    if (res) {
      await load()
      return true
    }
    return false
  }

  async function remove(id: number): Promise<boolean> {
    items.value = items.value.filter(m => m.id !== id)
    const res = await api(
      () => window.api.deleteScheduledMessage(id),
      { context: 'delete' },
    )
    if (res) {
      showToast('Message programmé supprimé.', 'info')
      return true
    }
    await load()
    return false
  }

  return {
    items, loading, pendingCount, failedCount,
    load, create, update, remove,
  }
}
