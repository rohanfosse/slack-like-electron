/**
 * useSidebarArchivedChannels : charge + gere l'etat des canaux archives
 * (staff only). Reactif au changement de promo active, ouverture de route
 * messages, et modification du set de canaux visibles.
 */
import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { channelMemberCount } from '@/composables/useSidebarNav'
import type { Channel } from '@/types'

export function useSidebarArchivedChannels(
  channels: Ref<Channel[]>,
  restoreChannel: (id: number) => Promise<unknown>,
  emitNavigate: () => void,
) {
  const appStore = useAppStore()
  const route = useRoute()

  const archivedChannels = ref<Channel[]>([])
  const collapsed = ref(true)

  async function load() {
    if (!appStore.isStaff || !appStore.activePromoId) {
      archivedChannels.value = []
      return
    }
    try {
      const res = await window.api.getArchivedChannels(appStore.activePromoId)
      archivedChannels.value = res?.ok ? res.data : []
    } catch {
      archivedChannels.value = []
    }
  }

  function selectArchived(ch: Channel) {
    appStore.openChannel(
      ch.id,
      ch.promo_id,
      ch.name,
      ch.type,
      ch.description ?? '',
      true,
      !!ch.is_private,
      channelMemberCount(ch),
    )
    emitNavigate()
  }

  async function restore(channelId: number) {
    await restoreChannel(channelId)
    await load()
  }

  watch(() => appStore.activePromoId, load)
  watch(() => route.name, (n) => { if (n === 'messages') load() })
  watch(channels, load)

  return { archivedChannels, collapsed, load, selectArchived, restore }
}
